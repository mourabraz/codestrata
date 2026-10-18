// Usage: node --max-old-space-size=N src/typed-pass.ts <repo-root> [--include <subdir>] [--tsconfig <file>]
//        [--diagnostics] [--edges <path-substring>] [--label <name>]
// Builds one TS 6 program and resolves every call site to its declaration with the type checker.
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { listSourceFiles, mb } from './files.ts';

const arg = (name: string) => {
  const index = process.argv.indexOf(name);
  return index > 0 ? process.argv[index + 1] : undefined;
};

const root = resolve(process.argv[2] ?? '.');
const include = arg('--include') ?? '';
const edgesFilter = arg('--edges');
const label = arg('--label') ?? `${basename(root)}${include ? `-${basename(include)}` : ''}`;

let peakRss = 0;
const sampler = setInterval(() => (peakRss = Math.max(peakRss, process.memoryUsage().rss)), 50);
const snapshot = () => ({ rssMB: mb(process.memoryUsage().rss), heapMB: mb(process.memoryUsage().heapUsed) });

// Compiler options come from the closest tsconfig; the file list comes from our own walk.
const tsconfigPath =
  arg('--tsconfig') !== undefined
    ? resolve(root, arg('--tsconfig') as string)
    : (ts.findConfigFile(join(root, include), ts.sys.fileExists) ?? join(root, 'tsconfig.json'));
const parsed = ts.getParsedCommandLineOfConfigFile(tsconfigPath, { ignoreDeprecations: '6.0' }, {
  ...ts.sys,
  onUnRecoverableConfigFileDiagnostic: () => {},
});
const options: ts.CompilerOptions = {
  ...(parsed?.options ?? {}),
  noEmit: true,
  skipLibCheck: true,
  incremental: false,
  composite: false,
  ignoreDeprecations: '6.0',
};

const rootNames = listSourceFiles(join(root, include))
  .filter((file) => file.kind !== 'declaration')
  .map((file) => file.path);

const t0 = performance.now();
const program = ts.createProgram({ rootNames, options });
const createMs = performance.now() - t0;
const afterCreate = snapshot();

const t1 = performance.now();
const checker = program.getTypeChecker();
const checkerMs = performance.now() - t1;

type Bucket = { internal: number; external: number; unresolved: number };
const empty = (): Bucket => ({ internal: 0, external: 0, unresolved: 0 });
const calls = { identifier: empty(), member: empty(), other: empty() };
const edges: string[] = [];
const isInternal = (fileName: string) => fileName.startsWith(root) && !fileName.includes('/node_modules/');

const t2 = performance.now();
const rootSet = new Set(rootNames);
for (const sourceFile of program.getSourceFiles()) {
  if (!rootSet.has(sourceFile.fileName)) continue;
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      const callee = node.expression;
      const kind = ts.isIdentifier(callee) ? 'identifier' : ts.isPropertyAccessExpression(callee) ? 'member' : 'other';
      const nameNode = ts.isPropertyAccessExpression(callee) ? callee.name : callee;
      let symbol = checker.getSymbolAtLocation(nameNode);
      if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
      const declaration = symbol?.declarations?.[0];
      if (!declaration) {
        calls[kind].unresolved++;
      } else {
        const target = declaration.getSourceFile().fileName;
        calls[kind][isInternal(target) ? 'internal' : 'external']++;
        if (edgesFilter && sourceFile.fileName.includes(edgesFilter) && isInternal(target)) {
          const from = sourceFile.getLineAndCharacterOfPosition(callee.getStart());
          const owner = declaration.parent && 'name' in declaration.parent && declaration.parent.name
            ? `${(declaration.parent.name as ts.Identifier).text}.`
            : '';
          edges.push(
            `${relative(root, sourceFile.fileName)}:${from.line + 1}  ${callee.getText().replace(/\s+/g, '')}  ->  ${relative(root, target)}#${owner}${symbol?.name}`,
          );
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}
const resolveMs = performance.now() - t2;
const afterResolve = snapshot();

let diagnostics: { ms: number; count: number } | undefined;
if (process.argv.includes('--diagnostics')) {
  const t3 = performance.now();
  const count = ts.getPreEmitDiagnostics(program).length;
  diagnostics = { ms: Math.round(performance.now() - t3), count };
}

clearInterval(sampler);
peakRss = Math.max(peakRss, process.memoryUsage().rss);

const pct = (bucket: Bucket) => {
  const total = bucket.internal + bucket.external + bucket.unresolved;
  return total ? Math.round(((bucket.internal + bucket.external) / total) * 1000) / 10 : null;
};
const report = {
  label,
  typescript: ts.version,
  tsconfig: relative(root, tsconfigPath),
  rootFiles: rootNames.length,
  programFiles: program.getSourceFiles().length,
  ms: {
    createProgram: Math.round(createMs),
    getChecker: Math.round(checkerMs),
    resolveCalls: Math.round(resolveMs),
    total: Math.round(createMs + checkerMs + resolveMs),
  },
  memory: { afterCreate, afterResolve, peakRssMB: mb(peakRss) },
  calls,
  resolvedPct: { identifier: pct(calls.identifier), member: pct(calls.member), other: pct(calls.other) },
  diagnostics,
  edges: edges.slice(0, 200),
};

const out = join(import.meta.dirname, '..', 'results', `${label}-typed.json`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(report, null, 2));
const { edges: _edges, ...summary } = report;
console.log(JSON.stringify(summary, null, 2));
if (edgesFilter) console.log(edges.join('\n'));
