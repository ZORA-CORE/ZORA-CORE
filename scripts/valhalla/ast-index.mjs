#!/usr/bin/env node
/**
 * Valhalla AI — Master Protocol PR 3 (The Singularity).
 *
 * ts-morph indexer that walks the repo's TypeScript sources, extracts
 * file-level exports and import edges, and upserts the graph into
 * Supabase (`valhalla_ast_nodes` + `valhalla_ast_edges`).
 *
 * EIVOR / ODIN read from this graph via `frontend/src/lib/valhalla/
 * singularity/store.ts#fetchAstSummary` during the Pulse cron.
 *
 * Invocation:
 *   SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *   [VALHALLA_REPO_NAME=ZORA-CORE/ZORA-CORE]
 *   [VALHALLA_INDEX_ROOTS="frontend/src,workers/api/src"]
 *   node scripts/valhalla/ast-index.mjs
 *
 * Designed for GitHub Actions on push-to-main. Dry-run mode: if the
 * Supabase creds are missing, the script still runs and logs a summary
 * so the workflow remains green on PRs from forks that lack secrets.
 */

import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { resolve as resolvePath, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const { Project } = require('ts-morph');

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolvePath(__dirname, '..', '..');
const REPO_NAME = process.env.VALHALLA_REPO_NAME || 'ZORA-CORE/ZORA-CORE';
const ROOTS = (process.env.VALHALLA_INDEX_ROOTS || 'frontend/src,workers/api/src')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const DRY_RUN = !SUPABASE_URL || !SUPABASE_KEY;

const NODE_KINDS = new Set([
  'file',
  'export',
  'class',
  'function',
  'interface',
  'type',
  'default_export',
]);

function log(...args) {
  console.log('[ast-index]', ...args);
}

function repoRelative(abs) {
  return relative(REPO_ROOT, abs).split(sep).join('/');
}

function sha256(s) {
  return createHash('sha256').update(s).digest('hex').slice(0, 16);
}

/**
 * Resolve a relative import (e.g. `../lib/foo`) to a repo-relative
 * file path. Returns null for node_modules / alias imports that we
 * can't confidently resolve with filesystem checks alone — they're
 * still captured as edges with target_path set to the raw specifier.
 */
function resolveImportTarget(sourceFileAbs, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = resolvePath(dirname(sourceFileAbs), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mts`,
    `${base}.cts`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    `${base}/index.js`,
  ];
  for (const c of candidates) {
    if (existsSync(c)) return repoRelative(c);
  }
  return null;
}

async function supabaseFetch(pathAndQuery, init = {}) {
  if (DRY_RUN) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Supabase ${init.method || 'GET'} ${pathAndQuery} failed ${res.status}: ${body.slice(0, 400)}`,
    );
  }
  return res;
}

async function wipeGraph() {
  if (DRY_RUN) return;
  await supabaseFetch(
    `/valhalla_ast_edges?repo=eq.${encodeURIComponent(REPO_NAME)}`,
    { method: 'DELETE' },
  );
  await supabaseFetch(
    `/valhalla_ast_nodes?repo=eq.${encodeURIComponent(REPO_NAME)}`,
    { method: 'DELETE' },
  );
}

async function batchInsert(table, rows, chunkSize = 500) {
  if (DRY_RUN || rows.length === 0) return;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const slice = rows.slice(i, i + chunkSize);
    await supabaseFetch(`/${table}`, {
      method: 'POST',
      body: JSON.stringify(slice),
    });
  }
}

/**
 * Collect nodes + edges using AST-only APIs (no type checker). This
 * avoids ts-morph's "tsconfig must be parsed with
 * parseJsonSourceFileConfigFileContent" error that triggers when
 * `getExportedDeclarations` forces the compiler to construct a
 * Program from raw compiler options.
 */
function collectNodesAndEdges(project) {
  const nodes = [];
  const edges = [];
  const sourceFiles = project.getSourceFiles();
  log(`walking ${sourceFiles.length} source files`);

  for (const sf of sourceFiles) {
    const abs = sf.getFilePath();
    const relPath = repoRelative(abs);
    if (relPath.includes('node_modules') || relPath.includes('.next/')) continue;

    const text = sf.getFullText();
    nodes.push({
      repo: REPO_NAME,
      path: relPath,
      kind: 'file',
      name: relPath.split('/').pop() ?? relPath,
      line: 1,
      content_hash: sha256(text),
    });

    // Exported classes (AST-only modifier check; avoids type checker)
    for (const c of sf.getClasses()) {
      const hasExport = c.hasExportKeyword?.() ?? false;
      const hasDefault = c.hasDefaultKeyword?.() ?? false;
      if (!hasExport && !hasDefault) continue;
      nodes.push({
        repo: REPO_NAME,
        path: relPath,
        kind: hasDefault ? 'default_export' : 'class',
        name: c.getName() ?? 'default',
        line: c.getStartLineNumber(),
        content_hash: null,
      });
    }
    // Exported functions
    for (const f of sf.getFunctions()) {
      const hasExport = f.hasExportKeyword?.() ?? false;
      const hasDefault = f.hasDefaultKeyword?.() ?? false;
      if (!hasExport && !hasDefault) continue;
      nodes.push({
        repo: REPO_NAME,
        path: relPath,
        kind: hasDefault ? 'default_export' : 'function',
        name: f.getName() ?? 'default',
        line: f.getStartLineNumber(),
        content_hash: null,
      });
    }
    // Exported interfaces
    for (const i of sf.getInterfaces()) {
      if (!(i.hasExportKeyword?.() ?? false)) continue;
      nodes.push({
        repo: REPO_NAME,
        path: relPath,
        kind: 'interface',
        name: i.getName(),
        line: i.getStartLineNumber(),
        content_hash: null,
      });
    }
    // Exported type aliases
    for (const t of sf.getTypeAliases()) {
      if (!(t.hasExportKeyword?.() ?? false)) continue;
      nodes.push({
        repo: REPO_NAME,
        path: relPath,
        kind: 'type',
        name: t.getName(),
        line: t.getStartLineNumber(),
        content_hash: null,
      });
    }
    // Exported const/let/var
    for (const vs of sf.getVariableStatements()) {
      if (!(vs.hasExportKeyword?.() ?? false)) continue;
      for (const d of vs.getDeclarations()) {
        const name = d.getName();
        if (!name) continue;
        nodes.push({
          repo: REPO_NAME,
          path: relPath,
          kind: 'export',
          name,
          line: d.getStartLineNumber(),
          content_hash: null,
        });
      }
    }

    // Import edges
    for (const imp of sf.getImportDeclarations()) {
      const spec = imp.getModuleSpecifierValue();
      const target = resolveImportTarget(abs, spec) ?? spec;
      const def = imp.getDefaultImport()?.getText();
      const named = imp.getNamedImports().map((n) => n.getName()).join(',');
      edges.push({
        repo: REPO_NAME,
        source_path: relPath,
        target_path: target,
        kind: 'import',
        symbol: def || named || null,
      });
    }

    // Re-exports (export * from / export { x } from)
    for (const exp of sf.getExportDeclarations()) {
      const spec = exp.getModuleSpecifierValue();
      if (!spec) continue;
      const target = resolveImportTarget(abs, spec) ?? spec;
      edges.push({
        repo: REPO_NAME,
        source_path: relPath,
        target_path: target,
        kind: 're_export',
        symbol: exp.getNamedExports().map((n) => n.getName()).join(',') || null,
      });
    }
  }

  // Dedup nodes against the unique index (repo, path, kind, name).
  const seen = new Set();
  const uniqNodes = [];
  for (const n of nodes) {
    const k = `${n.repo}|${n.path}|${n.kind}|${n.name}`;
    if (seen.has(k)) continue;
    seen.add(k);
    uniqNodes.push(n);
  }
  return { nodes: uniqNodes, edges };
}

async function main() {
  const started = Date.now();
  if (DRY_RUN) {
    log('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — running DRY-RUN (no Supabase writes).');
  } else {
    log(`writing to ${SUPABASE_URL}`);
  }
  log(`repo=${REPO_NAME} roots=${ROOTS.join(',')}`);

  // No compiler options: we use AST-only APIs (no type checker), and
  // passing string enums like target: 'ES2022' triggers ts-morph's
  // "tsconfig must be parsed" error inside any checker call path.
  const project = new Project({ skipAddingFilesFromTsConfig: true, useInMemoryFileSystem: false });

  for (const root of ROOTS) {
    const abs = resolvePath(REPO_ROOT, root);
    if (!existsSync(abs)) {
      log(`root not found, skipping: ${root}`);
      continue;
    }
    const glob = `${abs}/**/*.{ts,tsx}`;
    project.addSourceFilesAtPaths(glob);
  }

  // Ignore synthetic + .d.ts; keep genuine project sources
  for (const sf of project.getSourceFiles()) {
    if (sf.isDeclarationFile()) project.removeSourceFile(sf);
  }

  const { nodes, edges } = collectNodesAndEdges(project);
  log(`collected ${nodes.length} nodes and ${edges.length} edges`);

  await wipeGraph();
  await batchInsert('valhalla_ast_nodes', nodes);
  await batchInsert('valhalla_ast_edges', edges);

  const ms = Date.now() - started;
  log(`done in ${ms}ms${DRY_RUN ? ' (dry-run)' : ''}`);
}

main().catch((err) => {
  console.error('[ast-index] FAILED:', err?.stack ?? err);
  process.exit(1);
});
