// Parses a list of files with oxc, resolves their imports with oxc-resolver and classifies call sites.
// Used directly (single thread) and from worker threads.
import { readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { parentPort, workerData } from 'node:worker_threads';
import { parseSync, Visitor } from 'oxc-parser';
import { ResolverFactory } from 'oxc-resolver';

export interface FastStats {
  files: number;
  bytes: number;
  parseErrors: number;
  readMs: number;
  parseMs: number;
  visitMs: number;
  resolveMs: number;
  // externalMissing: bare specifier of a package that is not installed; unresolved: relative/alias import that points nowhere
  imports: { internal: number; external: number; externalMissing: number; builtin: number; unresolved: number };
  unresolvedSamples: string[];
  calls: {
    importedFunction: number; // foo() where foo is imported: resolvable without types
    namespaceMember: number; // ns.foo() where ns is `import * as ns`: resolvable without types
    localOrGlobal: number; // foo() declared in the same file or a global
    memberNeedsTypes: number; // a.b() / this.x.y() / context.svc.m(): needs the type checker
    other: number;
  };
}

export function emptyStats(): FastStats {
  return {
    files: 0, bytes: 0, parseErrors: 0, readMs: 0, parseMs: 0, visitMs: 0, resolveMs: 0,
    imports: { internal: 0, external: 0, externalMissing: 0, builtin: 0, unresolved: 0 },
    unresolvedSamples: [],
    calls: { importedFunction: 0, namespaceMember: 0, localOrGlobal: 0, memberNeedsTypes: 0, other: 0 },
  };
}

export function mergeStats(target: FastStats, source: FastStats): void {
  for (const key of ['files', 'bytes', 'parseErrors', 'readMs', 'parseMs', 'visitMs', 'resolveMs'] as const) {
    target[key] += source[key];
  }
  for (const key of Object.keys(target.imports) as (keyof FastStats['imports'])[]) target.imports[key] += source.imports[key];
  for (const key of Object.keys(target.calls) as (keyof FastStats['calls'])[]) target.calls[key] += source.calls[key];
  target.unresolvedSamples.push(...source.unresolvedSamples.slice(0, 20 - target.unresolvedSamples.length));
}

export interface FastOptions {
  calls: boolean; // walk the AST in JS to classify call sites
  raw: boolean; // oxc experimentalRawTransfer
}

const BUILTINS = new Set(builtinModules);
const isBare = (specifier: string) => !specifier.startsWith('.') && !specifier.startsWith('/');

export function analyseFiles(root: string, paths: string[], options: FastOptions): FastStats {
  const stats = emptyStats();
  const resolver = new ResolverFactory({
    extensions: ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.json', '.d.ts'],
    extensionAlias: { '.js': ['.ts', '.tsx', '.js'] },
    conditionNames: ['types', 'import', 'require', 'node', 'default'],
    mainFields: ['types', 'module', 'main'],
    tsconfig: 'auto',
  });

  for (const path of paths) {
    let t = performance.now();
    const source = readFileSync(path, 'utf8');
    stats.readMs += performance.now() - t;
    stats.files++;
    stats.bytes += source.length;

    t = performance.now();
    const result = parseSync(path, source, options.raw ? { experimentalRawTransfer: true } as object : undefined);
    stats.parseMs += performance.now() - t;
    if (result.errors.length) stats.parseErrors++;

    t = performance.now();
    const specifiers: string[] = [];
    const importedLocals = new Set<string>();
    const namespaceLocals = new Set<string>();
    for (const imp of result.module.staticImports) {
      specifiers.push(imp.moduleRequest.value);
      for (const entry of imp.entries) {
        if (entry.importName.kind === 'NamespaceObject') namespaceLocals.add(entry.localName.value);
        else importedLocals.add(entry.localName.value);
      }
    }
    for (const exp of result.module.staticExports) {
      for (const entry of exp.entries) if (entry.moduleRequest) specifiers.push(entry.moduleRequest.value);
    }
    for (const dyn of result.module.dynamicImports) {
      const text = source.slice(dyn.moduleRequest.start, dyn.moduleRequest.end);
      if (/^['"`][^'"`$]+['"`]$/.test(text)) specifiers.push(text.slice(1, -1));
    }

    if (options.calls) new Visitor({
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type === 'Identifier') {
          if (importedLocals.has(callee.name)) stats.calls.importedFunction++;
          else stats.calls.localOrGlobal++;
        } else if (callee.type === 'MemberExpression') {
          if (callee.object.type === 'Identifier' && namespaceLocals.has(callee.object.name)) stats.calls.namespaceMember++;
          else stats.calls.memberNeedsTypes++;
        } else {
          stats.calls.other++;
        }
      },
    }).visit(result.program);
    stats.visitMs += performance.now() - t;

    t = performance.now();
    for (const specifier of new Set(specifiers)) {
      const resolved = resolver.resolveFileSync(path, specifier);
      if (resolved.builtin || specifier.startsWith('node:') || BUILTINS.has(specifier)) stats.imports.builtin++;
      else if (!resolved.path && isBare(specifier) && !specifier.startsWith('@/') && !specifier.startsWith('src/')) {
        // A package that is not installed (the spike repos are cloned without node_modules).
        stats.imports.externalMissing++;
      } else if (!resolved.path) {
        stats.imports.unresolved++;
        if (stats.unresolvedSamples.length < 20) stats.unresolvedSamples.push(`${path.slice(root.length + 1)} -> ${specifier}`);
      } else if (resolved.path.includes('/node_modules/')) stats.imports.external++;
      else stats.imports.internal++;
    }
    stats.resolveMs += performance.now() - t;
  }
  return stats;
}

if (parentPort && workerData) {
  parentPort.postMessage(analyseFiles(workerData.root, workerData.paths, workerData.options));
}
