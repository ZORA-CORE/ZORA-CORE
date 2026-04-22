import JSZip from 'jszip';
import type { Artifact } from './artifacts';
import type { ChatMessage } from './types';

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  typescript: 'ts',
  ts: 'ts',
  tsx: 'tsx',
  javascript: 'js',
  js: 'js',
  jsx: 'jsx',
  python: 'py',
  py: 'py',
  rust: 'rs',
  rs: 'rs',
  go: 'go',
  java: 'java',
  kotlin: 'kt',
  swift: 'swift',
  ruby: 'rb',
  rb: 'rb',
  csharp: 'cs',
  cs: 'cs',
  cpp: 'cpp',
  'c++': 'cpp',
  c: 'c',
  html: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  json: 'json',
  yaml: 'yaml',
  yml: 'yml',
  toml: 'toml',
  sql: 'sql',
  bash: 'sh',
  sh: 'sh',
  shell: 'sh',
  zsh: 'sh',
  dockerfile: 'Dockerfile',
  makefile: 'Makefile',
  markdown: 'md',
  md: 'md',
  mermaid: 'mmd',
  xml: 'xml',
  vue: 'vue',
  svelte: 'svelte',
  php: 'php',
  r: 'r',
  scala: 'scala',
  lua: 'lua',
  dart: 'dart',
  elixir: 'ex',
  ex: 'ex',
};

function sanitizeName(name: string): string {
  return name.replace(/[^\w.\-/]+/g, '_').replace(/^\/+/, '');
}

function filenameForArtifact(a: Artifact, index: number): string {
  // Honour explicit hints from the first comment line:
  //   // filename: foo/bar.ts       // path: foo/bar.ts
  //   # filename: foo/bar.py        -- filename: foo.sql
  const firstLine = a.code.split(/\r?\n/, 1)[0] ?? '';
  const hint = firstLine.match(
    /(?:\/\/|#|--|\/\*)\s*(?:filename|path|file)\s*[:=]\s*([A-Za-z0-9._\-\/]+)/i,
  );
  if (hint) return sanitizeName(hint[1]);

  const lang = (a.language ?? '').toLowerCase();
  const ext =
    LANGUAGE_EXTENSIONS[lang] ?? (lang.replace(/[^a-z0-9]+/g, '') || 'txt');
  const padded = String(index + 1).padStart(2, '0');
  return `snippet-${padded}.${ext}`;
}

function readme(messages: ChatMessage[]): string {
  const title = '# Valhalla AI — Session Bundle\n\n';
  const preamble =
    'This archive was exported from the Valhalla AI workspace. It contains:\n' +
    '\n' +
    '- `code/` — every fenced code block produced in this conversation.\n' +
    '- `ARCHITECTURE.md` — Mermaid diagrams from the session (if any).\n' +
    '- `TRANSCRIPT.md` — the full human-readable transcript.\n' +
    '- `DEPLOY.md` — one-liner instructions to ship the bundle to Vercel.\n\n';
  const transcriptLink = '_Full transcript lives in `TRANSCRIPT.md`._\n\n';
  return title + preamble + transcriptLink;
}

function transcript(messages: ChatMessage[]): string {
  const lines: string[] = ['# Transcript\n'];
  for (const m of messages) {
    const who = m.role === 'user' ? '## You' : '## Valhalla';
    lines.push(who);
    const ts = new Date(m.createdAt).toISOString();
    lines.push(`_${ts}_`);
    lines.push('');
    lines.push(m.content || '_(empty)_');
    lines.push('');
  }
  return lines.join('\n');
}

function architectureDoc(mermaidArtifacts: Artifact[]): string | null {
  if (mermaidArtifacts.length === 0) return null;
  const parts: string[] = ['# Architecture\n'];
  mermaidArtifacts.forEach((a, i) => {
    parts.push(`## Diagram ${i + 1}\n`);
    parts.push('```mermaid');
    parts.push(a.code.trim());
    parts.push('```');
    parts.push('');
  });
  return parts.join('\n');
}

const DEPLOY_INSTRUCTIONS = `# Ship to Vercel

This bundle can be deployed as-is:

\`\`\`bash
# from the unzipped folder
npx vercel@latest                # preview deploy (opens a browser for login)
npx vercel@latest --prod         # production deploy
\`\`\`

## vercel.json

A starter \`vercel.json\` is included. Adjust the framework preset or build
command for your stack:

- **Next.js**: delete \`vercel.json\` and run \`npx create-next-app@latest --use-pnpm .\`
  then move the contents of \`code/\` into \`app/\` or \`pages/\`.
- **FastAPI** / **Express**: wire the entrypoint as a Vercel Serverless
  Function under \`api/\`.
- **Static site**: set \`"framework": null\` and move \`index.html\` to the
  repo root.

## Environment

If your code references environment variables, set them via:

\`\`\`bash
npx vercel env add VARIABLE_NAME preview
npx vercel env add VARIABLE_NAME production
\`\`\`
`;

const VERCEL_JSON = JSON.stringify(
  {
    $schema: 'https://openapi.vercel.sh/vercel.json',
    framework: null,
    public: true,
  },
  null,
  2,
);

export interface BundleResult {
  blob: Blob;
  filename: string;
  artifactCount: number;
  mermaidCount: number;
}

export async function buildSessionBundle(
  artifacts: Artifact[],
  messages: ChatMessage[],
): Promise<BundleResult> {
  const zip = new JSZip();
  const code = artifacts.filter((a) => a.kind === 'code');
  const mermaid = artifacts.filter((a) => a.kind === 'mermaid');

  const codeFolder = zip.folder('code');
  const usedNames = new Set<string>();
  code.forEach((a, i) => {
    let name = filenameForArtifact(a, i);
    let attempt = 1;
    const base = name;
    while (usedNames.has(name)) {
      const dot = base.lastIndexOf('.');
      name =
        dot > 0
          ? `${base.slice(0, dot)}-${attempt}${base.slice(dot)}`
          : `${base}-${attempt}`;
      attempt += 1;
    }
    usedNames.add(name);
    codeFolder?.file(name, a.code);
  });

  zip.file('README.md', readme(messages));
  zip.file('TRANSCRIPT.md', transcript(messages));
  const archDoc = architectureDoc(mermaid);
  if (archDoc) zip.file('ARCHITECTURE.md', archDoc);
  zip.file('DEPLOY.md', DEPLOY_INSTRUCTIONS);
  zip.file('vercel.json', VERCEL_JSON);

  const blob = await zip.generateAsync({ type: 'blob' });
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  return {
    blob,
    filename: `valhalla-session-${stamp}.zip`,
    artifactCount: code.length,
    mermaidCount: mermaid.length,
  };
}

export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
