/**
 * Valhalla AI — Infinity Engine PR 2: Anthropic Tool Use definitions.
 *
 * Every Valhalla agent that operates in "Devin mode" is given a subset
 * of these tools. Each tool has:
 *   - a JSON Schema the Anthropic API validates against,
 *   - a `run(sandbox, input)` dispatcher that executes the call
 *     against an E2B `SandboxHandle` and returns a stringified result.
 *
 * Tools are intentionally simple and read-only-by-default. `write_file`,
 * `patch_file`, and `execute_bash` are elevated privileges — only
 * agents declared `writesCode = true` get them.
 */
import type Anthropic from '@anthropic-ai/sdk';
import type { SandboxHandle, ScreenshotResult } from '../sandbox/e2b';
import { storeGlobalMemory } from '../memory/store';

export type ToolName =
  | 'read_file'
  | 'list_dir'
  | 'write_file'
  | 'patch_file'
  | 'execute_bash'
  | 'screenshot_page'
  | 'expose_port'
  | 'store_global_memory'
  | 'finish';

/**
 * Context threaded into every tool call. Lets orchestration-aware
 * tools (e.g. `store_global_memory`, `expose_port`) reach the user's
 * identity and the SSE event bus without coupling them to a
 * particular orchestrator.
 */
export interface ToolContext {
  agent: string;
  userId: string;
  sessionId: string;
  /** Emit a SwarmEvent payload. Returns void; errors are swallowed. */
  emit(event: Record<string, unknown>): void;
  signal?: AbortSignal;
}

export interface ValhallaTool {
  name: ToolName;
  description: string;
  input_schema: Anthropic.Messages.Tool.InputSchema;
  /** Dispatch the tool call against the sandbox and return a stringified result. */
  run(
    sandbox: SandboxHandle,
    input: Record<string, unknown>,
    ctx?: ToolContext,
  ): Promise<ToolResult>;
}

export interface ToolResult {
  /** Free-form text the next Claude turn receives as the tool_result. */
  content: string;
  /** Structured payload emitted to the UI as a `tool_result` SSE event. */
  payload: Record<string, unknown>;
  /** Optional image content the next Claude turn receives (FREJA). */
  image?: { mediaType: 'image/png' | 'image/jpeg'; base64: string };
}

function asString(v: unknown, field: string): string {
  if (typeof v !== 'string' || !v)
    throw new Error(`Missing or empty string field \`${field}\`.`);
  return v;
}

function asOptionalNumber(v: unknown, field: string): number | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'number' || !Number.isFinite(v))
    throw new Error(`Field \`${field}\` must be a finite number if provided.`);
  return v;
}

const READ_FILE: ValhallaTool = {
  name: 'read_file',
  description:
    'Read the full contents of a file inside the cloud sandbox. ' +
    'Use this to inspect source files before editing them. Fails if the ' +
    'file does not exist or is larger than `max_bytes` (default 256KB).',
  input_schema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description:
          'Path to read, relative to the sandbox workdir (e.g. `src/app.ts`).',
      },
      max_bytes: {
        type: 'number',
        description:
          'Truncate above this many bytes. Default 262144. Max 1048576.',
      },
    },
    required: ['path'],
    additionalProperties: false,
  },
  async run(sandbox, input) {
    const path = asString(input.path, 'path');
    const maxBytes = Math.min(
      asOptionalNumber(input.max_bytes, 'max_bytes') ?? 262_144,
      1_048_576,
    );
    const content = await sandbox.readFile(path, { maxBytes });
    return {
      content,
      payload: { path, bytes: content.length },
    };
  },
};

const LIST_DIR: ValhallaTool = {
  name: 'list_dir',
  description:
    'List the immediate children of a directory inside the cloud sandbox. ' +
    'Entries are returned as `name\\ttype` lines where type is `dir` or `file`.',
  input_schema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description:
          'Directory path, relative to the sandbox workdir. Use "." for the workdir root.',
      },
    },
    required: ['path'],
    additionalProperties: false,
  },
  async run(sandbox, input) {
    const path = asString(input.path, 'path');
    const entries = await sandbox.listDir(path);
    const lines = entries
      .map((e) => `${e.name}\t${e.isDir ? 'dir' : 'file'}`)
      .join('\n');
    return {
      content: lines || '(empty directory)',
      payload: { path, count: entries.length },
    };
  },
};

const WRITE_FILE: ValhallaTool = {
  name: 'write_file',
  description:
    'Write `content` to `path`, overwriting any existing file. Parent ' +
    "directories are created automatically. Use `patch_file` for surgical " +
    'edits to existing files — this tool replaces the whole file.',
  input_schema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Destination path relative to the sandbox workdir.',
      },
      content: {
        type: 'string',
        description: 'Full file contents. Include the trailing newline.',
      },
    },
    required: ['path', 'content'],
    additionalProperties: false,
  },
  async run(sandbox, input) {
    const path = asString(input.path, 'path');
    const content = asString(input.content, 'content');
    await sandbox.writeFile(path, content);
    return {
      content: `wrote ${content.length} bytes to ${path}`,
      payload: { path, bytes: content.length },
    };
  },
};

const PATCH_FILE: ValhallaTool = {
  name: 'patch_file',
  description:
    'Replace the first (and ONLY) occurrence of `old_string` with ' +
    '`new_string` in `path`. Fails loudly if `old_string` does not appear ' +
    'or appears more than once — in the latter case, include more ' +
    'surrounding context so the match is unique.',
  input_schema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File to modify.' },
      old_string: {
        type: 'string',
        description: 'Exact substring to replace (must be unique in the file).',
      },
      new_string: {
        type: 'string',
        description: 'Replacement text. May be empty to delete `old_string`.',
      },
    },
    required: ['path', 'old_string', 'new_string'],
    additionalProperties: false,
  },
  async run(sandbox, input) {
    const path = asString(input.path, 'path');
    const oldString = asString(input.old_string, 'old_string');
    const newString =
      typeof input.new_string === 'string' ? input.new_string : '';
    const { replaced } = await sandbox.patchFile(path, oldString, newString);
    return {
      content: `patched ${path} (${replaced} replacement)`,
      payload: {
        path,
        oldBytes: oldString.length,
        newBytes: newString.length,
      },
    };
  },
};

const EXECUTE_BASH: ValhallaTool = {
  name: 'execute_bash',
  description:
    'Execute a bash command inside the cloud sandbox (E2B). Returns stdout, ' +
    'stderr, exit code. Use this for `npm install`, `npm run build`, ' +
    '`pytest`, `ls`, etc. Per-call timeout defaults to 30s (max 300s).',
  input_schema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'Full bash command. Redirections and pipes are allowed.',
      },
      cwd: {
        type: 'string',
        description:
          'Optional working directory, relative to the sandbox workdir.',
      },
      timeout_seconds: {
        type: 'number',
        description: 'Kill after this many seconds. Default 30, max 300.',
      },
    },
    required: ['command'],
    additionalProperties: false,
  },
  async run(sandbox, input) {
    const command = asString(input.command, 'command');
    const cwd = typeof input.cwd === 'string' ? input.cwd : undefined;
    const timeoutMs = Math.min(
      (asOptionalNumber(input.timeout_seconds, 'timeout_seconds') ?? 30) * 1000,
      300_000,
    );
    const result = await sandbox.exec(command, { cwd, timeoutMs });
    const statusLine =
      `exit=${result.exitCode}` +
      (result.timedOut ? ' TIMEOUT' : '') +
      ` duration=${result.durationMs}ms`;
    const body = [
      statusLine,
      '--- stdout ---',
      result.stdout || '(empty)',
      '--- stderr ---',
      result.stderr || '(empty)',
    ].join('\n');
    return {
      content: body,
      payload: {
        command,
        exitCode: result.exitCode,
        timedOut: result.timedOut,
        durationMs: result.durationMs,
      },
    };
  },
};

const SCREENSHOT_PAGE: ValhallaTool = {
  name: 'screenshot_page',
  description:
    "FREJA-only: launch headless Chromium inside the sandbox, load `url`, " +
    'and return a PNG screenshot as an image content block. Use this to ' +
    'inspect your own UI output before claiming it is finished.',
  input_schema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description:
          'URL to load. For local previews inside the sandbox, start a dev ' +
          'server in another `execute_bash` call first, then pass its URL.',
      },
      width: {
        type: 'number',
        description: 'Viewport width px. Default 1280.',
      },
      height: {
        type: 'number',
        description: 'Viewport height px. Default 800.',
      },
      wait_ms: {
        type: 'number',
        description: 'Delay after networkidle before capture. Default 1500.',
      },
      full_page: {
        type: 'boolean',
        description: 'Capture full scrolling page, not just the viewport.',
      },
    },
    required: ['url'],
    additionalProperties: false,
  },
  async run(sandbox, input) {
    const url = asString(input.url, 'url');
    const width = asOptionalNumber(input.width, 'width') ?? 1280;
    const height = asOptionalNumber(input.height, 'height') ?? 800;
    const waitMs = asOptionalNumber(input.wait_ms, 'wait_ms') ?? 1500;
    const fullPage = input.full_page === true;
    const shot: ScreenshotResult = await sandbox.screenshot(url, {
      viewport: { width, height },
      waitMs,
      fullPage,
    });
    return {
      content: `captured ${width}x${height} screenshot of ${url}`,
      payload: { url, viewport: shot.viewport, bytes: shot.base64.length },
      image: { mediaType: 'image/png', base64: shot.base64 },
    };
  },
};

const FINISH: ValhallaTool = {
  name: 'finish',
  description:
    'Call this EXACTLY ONCE when you are done with the task. Summarize ' +
    'what you produced, how to verify it, and any open questions for the ' +
    'next agent or the user. Calling `finish` ends your turn — do not ' +
    'call any other tools afterward.',
  input_schema: {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description: '2-8 line summary of what was done this turn.',
      },
      verification: {
        type: 'string',
        description:
          'Concrete, checkable criteria to confirm the work (tests, ' +
          'invariants, commands).',
      },
      open_questions: {
        type: 'string',
        description:
          'Optional. Anything you could not resolve, for the next agent.',
      },
    },
    required: ['summary', 'verification'],
    additionalProperties: false,
  },
  async run(_sandbox, input) {
    const summary = asString(input.summary, 'summary');
    const verification = asString(input.verification, 'verification');
    const openQuestions =
      typeof input.open_questions === 'string' ? input.open_questions : '';
    const content = [
      '## summary',
      summary,
      '',
      '## verification',
      verification,
      ...(openQuestions ? ['', '## open_questions', openQuestions] : []),
    ].join('\n');
    return {
      content,
      payload: { summary, verification, openQuestions: openQuestions || null },
    };
  },
};

const EXPOSE_PORT: ValhallaTool = {
  name: 'expose_port',
  description:
    'Expose a local TCP port inside the E2B sandbox as a public HTTPS ' +
    'URL so the Valhalla Live Preview can render it. Use this after ' +
    'starting a dev server (e.g. `npm run dev` on :3000) to hand the ' +
    'frontend a "Waiting for localhost:PORT…" iframe target.',
  input_schema: {
    type: 'object',
    properties: {
      port: {
        type: 'number',
        description:
          'Sandbox-local TCP port the dev server is listening on (e.g. 3000).',
      },
    },
    required: ['port'],
    additionalProperties: false,
  },
  async run(sandbox, input, ctx) {
    const rawPort = asOptionalNumber(input.port, 'port');
    if (typeof rawPort !== 'number' || !Number.isInteger(rawPort) || rawPort < 1 || rawPort > 65535) {
      throw new Error('`port` must be an integer in [1, 65535].');
    }
    const url = await sandbox.exposePort(rawPort);
    if (ctx) {
      ctx.emit({
        type: 'preview_url',
        agent: ctx.agent,
        url,
        port: rawPort,
        at: Date.now(),
      });
    }
    return {
      content: `exposed port ${rawPort} at ${url}`,
      payload: { port: rawPort, url },
    };
  },
};

const STORE_GLOBAL_MEMORY: ValhallaTool = {
  name: 'store_global_memory',
  description:
    'EIVOR-only: persist a major architectural decision, standing ' +
    'non-negotiable, or long-term user preference into the `global_user` ' +
    'memory pool so it is auto-injected into every future ODIN boot ' +
    'prompt. Use sparingly: only for context the user wants remembered ' +
    'ACROSS chats. Never store per-task trivia, PII, or anything the ' +
    'user asked us not to remember.',
  input_schema: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description:
          'Concise, self-contained statement of the preference or ' +
          'decision. Should make sense stripped of its original chat ' +
          'context (e.g. "User prefers Cloudflare Workers over Lambda ' +
          'for all HTTP APIs").',
      },
      kind: {
        type: 'string',
        enum: ['plan', 'code', 'critique', 'counterexample', 'turn'],
        description:
          'Memory kind. Defaults to "plan" since global memories are ' +
          'usually architectural decisions.',
      },
    },
    required: ['content'],
    additionalProperties: false,
  },
  async run(_sandbox, input, ctx) {
    const content = asString(input.content, 'content');
    const kindRaw = typeof input.kind === 'string' ? input.kind : 'plan';
    const allowedKinds = ['plan', 'code', 'critique', 'counterexample', 'turn'] as const;
    type KindTuple = typeof allowedKinds;
    const kind: KindTuple[number] = (allowedKinds as readonly string[]).includes(kindRaw)
      ? (kindRaw as KindTuple[number])
      : 'plan';
    if (!ctx) {
      // Without a ToolContext we cannot identify the user — refuse
      // rather than silently writing an orphaned row.
      throw new Error(
        'store_global_memory requires a ToolContext with userId. ' +
          'Tool-agent did not supply one.',
      );
    }
    const id = await storeGlobalMemory(
      {
        userId: ctx.userId,
        sessionId: ctx.sessionId,
        kind,
        content,
      },
      ctx.signal,
    );
    ctx.emit({
      type: 'global_memory_stored',
      agent: ctx.agent,
      snippet: content.length > 160 ? `${content.slice(0, 160)}…` : content,
      at: Date.now(),
    });
    return {
      content: id
        ? `stored global memory ${id} (${content.length} chars)`
        : 'memory store is not configured; no-op',
      payload: {
        id: id ?? null,
        bytes: content.length,
        scope: 'global_user',
        kind,
      },
    };
  },
};

export const ALL_TOOLS: Record<ToolName, ValhallaTool> = {
  read_file: READ_FILE,
  list_dir: LIST_DIR,
  write_file: WRITE_FILE,
  patch_file: PATCH_FILE,
  execute_bash: EXECUTE_BASH,
  screenshot_page: SCREENSHOT_PAGE,
  expose_port: EXPOSE_PORT,
  store_global_memory: STORE_GLOBAL_MEMORY,
  finish: FINISH,
};

/** Subset an agent is allowed to use. */
export function selectTools(names: readonly ToolName[]): ValhallaTool[] {
  return names.map((n) => {
    const t = ALL_TOOLS[n];
    if (!t) throw new Error(`Unknown Valhalla tool: ${n}`);
    return t;
  });
}

/** Convert tool defs into the Anthropic tools array. */
export function toolsForAnthropic(
  tools: readonly ValhallaTool[],
): Anthropic.Messages.Tool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
  }));
}
