// Usage: node scripts/build-data.mjs
// Builds the compact datasets embedded in the design prototype from the spike outputs:
//   ../visualization/data/<name>.raw.json  (files, projects, import edges)  — from spikes/indexing/src/export-graph.ts
//   data/<name>.usage.json                 (symbol usage, prod vs tests)    — from spikes/indexing/src/export-usage.ts
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const here = resolve(import.meta.dirname, '..');
const sources = {
  fixture: resolve(here, '../../fixtures/streaming-bff'),
  hive: resolve(here, '../indexing/.repos/hive'),
};

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function manifest(repo, dir) {
  for (const name of ['package.json', 'project.json']) {
    const path = join(repo, dir, name);
    if (existsSync(path)) {
      const json = readJson(path);
      return { name: json.name ?? dir, tags: json.nx?.tags ?? json.tags ?? [] };
    }
  }
  return { name: dir, tags: [] };
}

/** Layer = longest path down to a project with no dependencies (strongly connected projects share a layer). */
function layers(count, edges) {
  const out = Array.from({ length: count }, () => new Set());
  for (const [a, b] of edges) if (a !== b) out[a].add(b);
  // Tarjan SCC
  let index = 0;
  const idx = new Array(count).fill(-1), low = new Array(count).fill(0), onStack = new Array(count).fill(false);
  const stack = [], comp = new Array(count).fill(-1);
  let comps = 0;
  const strong = (v) => {
    idx[v] = low[v] = index++;
    stack.push(v);
    onStack[v] = true;
    for (const w of out[v]) {
      if (idx[w] === -1) { strong(w); low[v] = Math.min(low[v], low[w]); }
      else if (onStack[w]) low[v] = Math.min(low[v], idx[w]);
    }
    if (low[v] === idx[v]) {
      let w;
      do { w = stack.pop(); onStack[w] = false; comp[w] = comps; } while (w !== v);
      comps++;
    }
  };
  for (let v = 0; v < count; v++) if (idx[v] === -1) strong(v);
  const cOut = Array.from({ length: comps }, () => new Set());
  for (let v = 0; v < count; v++) for (const w of out[v]) if (comp[v] !== comp[w]) cOut[comp[v]].add(comp[w]);
  const height = new Array(comps).fill(-1);
  const h = (c) => {
    if (height[c] >= 0) return height[c];
    height[c] = 0;
    let best = 0;
    for (const d of cOut[c]) best = Math.max(best, h(d) + 1);
    return (height[c] = best);
  };
  return { layer: Array.from({ length: count }, (_, v) => h(comp[v])), cyclic: Array.from({ length: count }, (_, v) => comp.filter((c) => c === comp[v]).length > 1) };
}

function build(name) {
  const repo = sources[name];
  const raw = readJson(join(here, '../visualization/data', `${name}.raw.json`));
  const usage = readJson(join(here, 'data', `${name}.usage.json`));

  // Projects (by directory) with their manifest name and tags.
  const dirs = [...new Set(raw.nodes.map((n) => n.project))].sort();
  const dirIndex = new Map(dirs.map((d, i) => [d, i]));
  const projects = dirs.map((dir) => {
    const m = dir === '(root)' ? { name: 'workspace root', tags: [] } : manifest(repo, dir);
    return { name: m.name, dir, tags: m.tags, group: dir.split('/').slice(0, -1).join('/') || dir, files: 0, tests: 0, loc: 0 };
  });

  // Files with lines of code.
  const fileIndex = new Map();
  const files = raw.nodes.map((n, i) => {
    fileIndex.set(n.path, i);
    let loc = 0;
    try { loc = readFileSync(join(repo, n.path), 'utf8').split('\n').length; } catch { /* missing */ }
    const p = projects[dirIndex.get(n.project)];
    if (n.kind === 'test') p.tests++; else p.files++;
    p.loc += n.kind === 'source' ? loc : 0;
    return { p: n.path, j: dirIndex.get(n.project), k: n.kind[0], loc };
  });

  // Project edges: [from, to, imports from production code, from tests, from generated files].
  const pe = new Map();
  for (const [s, t] of raw.edges) {
    const a = files[s].j, b = files[t].j;
    if (a === b) continue;
    const key = `${a},${b}`;
    const e = pe.get(key) ?? [a, b, 0, 0, 0];
    e[files[s].k === 't' ? 3 : files[s].k === 'g' ? 4 : 2]++;
    pe.set(key, e);
  }
  const projectEdges = [...pe.values()];
  const { layer, cyclic } = layers(projects.length, projectEdges.filter((e) => e[2] > 0));
  projects.forEach((p, i) => { p.layer = layer[i]; p.cyclic = cyclic[i]; });

  // Architecture rules (fixture only, from Nx tags): flag edges that break them.
  const rules = name === 'fixture'
    ? [
        { id: 'module-module', text: 'A GraphQL module must not depend on another module (share entities through the schema instead)', test: (a, b) => a.tags.includes('type:gql-module') && b.tags.includes('type:gql-module') },
        { id: 'module-http', text: 'A GraphQL module must not talk HTTP directly (go through a service)', test: (a, b) => a.tags.includes('type:gql-module') && b.name === '@streaming/http-client' },
      ]
    : [];
  const violations = [];
  for (const e of projectEdges) {
    for (const r of rules) if (e[2] > 0 && r.test(projects[e[0]], projects[e[1]])) violations.push([e[0], e[1], r.id]);
  }

  // Symbols: compact arrays referencing files by index.
  const symIndex = new Map(usage.symbols.map((s, i) => [s.id, i]));
  const fi = (path) => fileIndex.get(path) ?? -1;
  const symbols = usage.symbols.map((s) => ({
    n: s.name,
    k: s.kind,
    f: fi(s.file),
    l: s.line,
    x: s.exported ? 1 : 0,
    g: s.generated ? 1 : 0,
    u: s.prodUses.map((u) => [fi(u.file), u.line, u.from ? (symIndex.get(u.from) ?? -1) : -1]),
    t: s.testUses.map((u) => [fi(u.file), u.line]),
    o: s.uses.map((id) => symIndex.get(id)).filter((v) => v !== undefined),
  }));

  // Request-flow links (fixture only): schema fields ↔ resolvers, operations, loaders, exits — mapped to indices.
  let flow = null;
  const flowPath = join(here, 'data', `${name}.flow.json`);
  if (existsSync(flowPath)) {
    const f = readJson(flowPath);
    const sym = (id) => (id ? (symIndex.get(id) ?? -1) : -1);
    flow = {
      entries: f.entries,
      operations: f.operations,
      resolverFields: f.resolverFields.map((r) => ({ ...r, file: fi(r.file) })),
      loaders: f.loaders.map((l) => ({ owner: sym(l.owner), field: l.field, file: fi(l.file), line: l.line, users: l.users.map(sym), targets: l.targets.map(sym), exits: l.exits })),
      exits: f.exits.map((e) => ({ ...e, from: sym(e.from), file: fi(e.file) })),
    };
  }

  return {
    name,
    flow,
    projects,
    projectEdges,
    rules: rules.map(({ id, text }) => ({ id, text })),
    violations,
    files,
    symbols,
    trace: name === 'fixture' ? readJson(join(here, 'data', 'fixture.trace.json')) : null,
  };
}

const out = { generatedAt: new Date().toISOString().slice(0, 10), datasets: ['fixture', 'hive'].map(build) };
const json = JSON.stringify(out);
writeFileSync(join(here, 'data', 'prototype-data.json'), json);
for (const d of out.datasets) {
  console.log(`${d.name}: ${d.projects.length} projects, ${d.projectEdges.length} project edges, ${d.files.length} files, ${d.symbols.length} symbols, ${d.violations.length} rule violations`);
}
console.log(`prototype-data.json: ${(json.length / 1024 / 1024).toFixed(2)} MB`);
