// Usage: node src/export-graph.ts <repo-root> <out.json>
// Exports the internal file-level import graph (files, their project, internal import edges) for the visualization spike.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { parseSync } from 'oxc-parser';
import { ResolverFactory } from 'oxc-resolver';
import { listSourceFiles } from './files.ts';

const root = resolve(process.argv[2]);
const out = resolve(process.argv[3]);

const resolver = new ResolverFactory({
  extensions: ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.json', '.d.ts'],
  extensionAlias: { '.js': ['.ts', '.tsx', '.js'] },
  conditionNames: ['types', 'import', 'require', 'node', 'default'],
  mainFields: ['types', 'module', 'main'],
  tsconfig: 'auto',
});

// The project of a file is the closest directory with a package.json or project.json.
const projectCache = new Map<string, string>();
function projectOf(file: string): string {
  let dir = dirname(file);
  const visited: string[] = [];
  while (dir.startsWith(root)) {
    const cached = projectCache.get(dir);
    if (cached !== undefined) {
      for (const v of visited) projectCache.set(v, cached);
      return cached;
    }
    visited.push(dir);
    if (existsSync(join(dir, 'package.json')) || existsSync(join(dir, 'project.json'))) {
      const name = relative(root, dir) || '(root)';
      for (const v of visited) projectCache.set(v, name);
      return name;
    }
    if (dir === root) break;
    dir = dirname(dir);
  }
  for (const v of visited) projectCache.set(v, '(root)');
  return '(root)';
}

const files = listSourceFiles(root).filter((f) => f.kind !== 'declaration');
const index = new Map(files.map((f, i) => [f.path, i]));
const edges = new Set<string>();

for (const [i, file] of files.entries()) {
  const result = parseSync(file.path, readFileSync(file.path, 'utf8'), { experimentalRawTransfer: true } as object);
  const specifiers = new Set<string>();
  for (const imp of result.module.staticImports) specifiers.add(imp.moduleRequest.value);
  for (const exp of result.module.staticExports) {
    for (const entry of exp.entries) if (entry.moduleRequest) specifiers.add(entry.moduleRequest.value);
  }
  for (const specifier of specifiers) {
    const target = resolver.resolveFileSync(file.path, specifier).path;
    const j = target === undefined ? undefined : index.get(target);
    if (j !== undefined && j !== i) edges.add(`${i},${j}`);
  }
}

const nodes = files.map((f) => ({
  path: relative(root, f.path),
  project: projectOf(f.path),
  kind: f.kind,
}));
writeFileSync(out, JSON.stringify({ nodes, edges: [...edges].map((e) => e.split(',').map(Number)) }));
console.log(`${nodes.length} files, ${edges.size} internal import edges -> ${out}`);
