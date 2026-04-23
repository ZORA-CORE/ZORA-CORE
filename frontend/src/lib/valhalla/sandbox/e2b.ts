/**
 * Valhalla AI — Infinity Engine PR 2: E2B cloud sandbox wrapper.
 *
 * Every Valhalla agent that wants to touch code does it through a
 * `SandboxHandle` returned from `createSandbox()`. The handle exposes
 * the full Devin.ai toolset (read_file, list_dir, write_file,
 * patch_file, execute_bash) plus FREJA's visual-QA primitives
 * (screenshot_page, inspect_dom). All filesystem state lives inside
 * E2B's Firecracker microVM so the swarm can never touch the host.
 *
 * If `E2B_API_KEY` is not set the wrapper throws a clear error at
 * create time — agents fall back to the structured-output path.
 */
import { Sandbox } from '@e2b/code-interpreter';

export const SANDBOX_DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 min
export const SANDBOX_MAX_TIMEOUT_MS = 15 * 60 * 1000; // 15 min
export const SANDBOX_DEFAULT_WORKDIR = '/home/user/valhalla';

export interface SandboxCreateOptions {
  /** Agent name for logging / pool keying. */
  agent: string;
  /** Max lifetime in ms before auto-kill. Capped at 15 min. */
  timeoutMs?: number;
  /** Optional template id. Defaults to E2B's base `code-interpreter-v1`. */
  template?: string;
  /** Env vars to expose inside the sandbox. */
  envs?: Record<string, string>;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  /** True if the command hit its per-call timeout and was killed. */
  timedOut: boolean;
  /** Wall time of the command in ms. */
  durationMs: number;
}

export interface ListEntry {
  name: string;
  /** POSIX absolute path inside the sandbox. */
  path: string;
  isDir: boolean;
}

export interface ScreenshotResult {
  /** Base64-encoded PNG bytes. */
  base64: string;
  /** Viewport the screenshot was taken at. */
  viewport: { width: number; height: number };
}

/**
 * Handle to a running E2B sandbox. Methods are bound to this instance
 * so they can be passed as tool-dispatch callbacks without `this`.
 */
export interface SandboxHandle {
  readonly id: string;
  readonly agent: string;
  readonly workdir: string;
  exec(cmd: string, opts?: { timeoutMs?: number; cwd?: string }): Promise<ExecResult>;
  readFile(path: string, opts?: { maxBytes?: number }): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  patchFile(path: string, oldString: string, newString: string): Promise<{ replaced: number }>;
  listDir(path: string): Promise<ListEntry[]>;
  screenshot(url: string, opts?: {
    viewport?: { width: number; height: number };
    waitMs?: number;
    fullPage?: boolean;
  }): Promise<ScreenshotResult>;
  kill(): Promise<void>;
}

/** True if E2B is available in this environment. */
export function isSandboxEnabled(): boolean {
  return Boolean(process.env.E2B_API_KEY);
}

/** Absolute-ify a user-supplied path against the sandbox workdir. */
function resolveInsideWorkdir(workdir: string, p: string): string {
  if (!p || typeof p !== 'string') {
    throw new Error('Path must be a non-empty string.');
  }
  // Collapse duplicate slashes; forbid '..' traversals that escape workdir.
  const normalized = p.replace(/\\/g, '/').replace(/\/+/g, '/');
  const full = normalized.startsWith('/') ? normalized : `${workdir}/${normalized}`;
  // Crude containment check: resolve and assert it still starts with workdir.
  // (E2B also enforces this server-side; this is defense-in-depth.)
  const parts: string[] = [];
  for (const seg of full.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') {
      if (parts.length === 0) {
        throw new Error(`Path escapes sandbox workdir: ${p}`);
      }
      parts.pop();
    } else {
      parts.push(seg);
    }
  }
  const resolved = `/${parts.join('/')}`;
  if (!resolved.startsWith(workdir)) {
    throw new Error(`Path escapes sandbox workdir: ${p}`);
  }
  return resolved;
}

/**
 * Create a fresh sandbox for an agent. Caller is responsible for
 * eventually calling `handle.kill()` — the orchestrator does this in
 * a `finally` block so a crashed agent cannot leak a running VM.
 */
export async function createSandbox(
  options: SandboxCreateOptions,
): Promise<SandboxHandle> {
  const apiKey = process.env.E2B_API_KEY;
  if (!apiKey) {
    throw new Error(
      'E2B_API_KEY is not set. The Valhalla Tool-Use path requires a ' +
        'cloud sandbox. Set E2B_API_KEY or disable VALHALLA_TOOL_USE.',
    );
  }
  const timeout = Math.min(
    options.timeoutMs ?? SANDBOX_DEFAULT_TIMEOUT_MS,
    SANDBOX_MAX_TIMEOUT_MS,
  );
  const createOpts = {
    apiKey,
    timeoutMs: timeout,
    envs: options.envs,
  };
  const sandbox = options.template
    ? await Sandbox.create(options.template, createOpts)
    : await Sandbox.create(createOpts);

  const workdir = SANDBOX_DEFAULT_WORKDIR;
  // Ensure the workdir exists so every subsequent path resolves cleanly.
  await sandbox.commands.run(`mkdir -p ${workdir}`, { cwd: '/' });

  return buildHandle(sandbox, options.agent, workdir);
}

function buildHandle(
  sandbox: Sandbox,
  agent: string,
  workdir: string,
): SandboxHandle {
  return {
    id: sandbox.sandboxId,
    agent,
    workdir,

    async exec(cmd, opts = {}) {
      const started = Date.now();
      const cwd = opts.cwd ? resolveInsideWorkdir(workdir, opts.cwd) : workdir;
      const timeoutMs = opts.timeoutMs ?? 30_000;
      try {
        const result = await sandbox.commands.run(cmd, {
          cwd,
          timeoutMs,
        });
        return {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          timedOut: false,
          durationMs: Date.now() - started,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // E2B throws on non-zero exit AND on timeout; differentiate.
        const timedOut = /timed? ?out/i.test(message);
        return {
          stdout: '',
          stderr: message,
          exitCode: timedOut ? 124 : 1,
          timedOut,
          durationMs: Date.now() - started,
        };
      }
    },

    async readFile(path, opts = {}) {
      const full = resolveInsideWorkdir(workdir, path);
      const text = await sandbox.files.read(full);
      if (opts.maxBytes && text.length > opts.maxBytes) {
        return `${text.slice(0, opts.maxBytes)}\n…[truncated: file is ${text.length} bytes, showed ${opts.maxBytes}]`;
      }
      return text;
    },

    async writeFile(path, content) {
      const full = resolveInsideWorkdir(workdir, path);
      // Ensure parent dirs exist so agents don't need to mkdir first.
      const parent = full.slice(0, Math.max(full.lastIndexOf('/'), 0));
      if (parent) {
        await sandbox.commands.run(`mkdir -p ${JSON.stringify(parent)}`, {
          cwd: '/',
        });
      }
      await sandbox.files.write(full, content);
    },

    async patchFile(path, oldString, newString) {
      const full = resolveInsideWorkdir(workdir, path);
      const current = await sandbox.files.read(full);
      if (!oldString) {
        throw new Error('patchFile: oldString must be non-empty.');
      }
      // Require a unique match so patches don't silently rewrite the
      // wrong occurrence — same rule Devin's own edit tool enforces.
      const firstIdx = current.indexOf(oldString);
      if (firstIdx === -1) {
        throw new Error(`patchFile: oldString not found in ${path}.`);
      }
      const secondIdx = current.indexOf(oldString, firstIdx + oldString.length);
      if (secondIdx !== -1) {
        throw new Error(
          `patchFile: oldString appears multiple times in ${path}; ` +
            'provide more surrounding context so the match is unique.',
        );
      }
      const next = current.slice(0, firstIdx) + newString + current.slice(firstIdx + oldString.length);
      await sandbox.files.write(full, next);
      return { replaced: 1 };
    },

    async listDir(path) {
      const full = resolveInsideWorkdir(workdir, path);
      const entries = await sandbox.files.list(full);
      return entries.map((e) => ({
        name: e.name,
        path: `${full.endsWith('/') ? full : `${full}/`}${e.name}`,
        isDir: e.type === 'dir',
      }));
    },

    async screenshot(url, opts = {}) {
      // FREJA only — we run a headless Chromium inside the sandbox via
      // Playwright and dump a base64 PNG. The sandbox template is
      // expected to have Playwright pre-installed; if not we install
      // on demand (cold-start cost amortized across the agent turn).
      const viewport = opts.viewport ?? { width: 1280, height: 800 };
      const waitMs = opts.waitMs ?? 1500;
      const fullPage = opts.fullPage ?? false;

      const script = [
        'import asyncio, base64, json, sys',
        'from playwright.async_api import async_playwright',
        'async def main():',
        '  async with async_playwright() as p:',
        '    browser = await p.chromium.launch()',
        '    ctx = await browser.new_context(viewport=' +
          JSON.stringify(viewport) +
          ')',
        '    page = await ctx.new_page()',
        '    await page.goto(' + JSON.stringify(url) + ', wait_until="networkidle")',
        `    await page.wait_for_timeout(${waitMs})`,
        '    png = await page.screenshot(full_page=' + (fullPage ? 'True' : 'False') + ')',
        '    sys.stdout.write(base64.b64encode(png).decode())',
        '    await browser.close()',
        'asyncio.run(main())',
      ].join('\n');

      const setup = await sandbox.commands.run(
        'python -c "import playwright" 2>/dev/null || (pip install --quiet playwright && playwright install --with-deps chromium)',
        { cwd: '/', timeoutMs: 180_000 },
      );
      if (setup.exitCode !== 0) {
        throw new Error(
          `screenshot: Playwright install failed: ${setup.stderr.slice(0, 400)}`,
        );
      }
      const run = await sandbox.commands.run(
        `python - <<'PY'\n${script}\nPY`,
        { cwd: workdir, timeoutMs: 90_000 },
      );
      if (run.exitCode !== 0) {
        throw new Error(
          `screenshot: Playwright run failed: ${run.stderr.slice(0, 400)}`,
        );
      }
      return { base64: run.stdout.trim(), viewport };
    },

    async kill() {
      try {
        await sandbox.kill();
      } catch {
        // Best effort — E2B also garbage-collects on timeout.
      }
    },
  };
}
