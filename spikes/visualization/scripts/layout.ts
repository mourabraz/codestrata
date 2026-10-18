// Usage: node scripts/layout.ts <name>   (reads data/<name>.raw.json, writes public/data/<name>.json)
// Precomputes a ForceAtlas2 layout so every renderer draws the exact same positions.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';

interface RawGraph {
  nodes: { path: string; project: string; kind: string }[];
  edges: [number, number][];
}

const name = process.argv[2];
const dir = join(import.meta.dirname, '..');
const raw = JSON.parse(readFileSync(join(dir, 'data', `${name}.raw.json`), 'utf8')) as RawGraph;

const projects = [...new Set(raw.nodes.map((n) => n.project))].sort();
const projectIndex = new Map(projects.map((p, i) => [p, i]));

// Seed: each project starts around its own point on a circle, so FA2 converges faster and keeps projects together.
const graph = new Graph({ type: 'directed', multi: false });
const radius = Math.sqrt(raw.nodes.length) * 10;
raw.nodes.forEach((node, i) => {
  const j = projectIndex.get(node.project) as number;
  const angle = (2 * Math.PI * j) / projects.length;
  graph.addNode(i, {
    x: Math.cos(angle) * radius + (Math.random() - 0.5) * radius * 0.2,
    y: Math.sin(angle) * radius + (Math.random() - 0.5) * radius * 0.2,
  });
});
for (const [s, t] of raw.edges) graph.mergeEdge(s, t);

const t0 = performance.now();
const iterations = raw.nodes.length > 10_000 ? 120 : 300;
forceAtlas2.assign(graph, {
  iterations,
  settings: { ...forceAtlas2.inferSettings(graph), barnesHutOptimize: raw.nodes.length > 2000, outboundAttractionDistribution: true },
});
const layoutMs = Math.round(performance.now() - t0);

// Project-level graph: one node per project at the centroid of its files, edges weighted by the number of imports.
const centroid = projects.map(() => ({ x: 0, y: 0, files: 0 }));
raw.nodes.forEach((node, i) => {
  const c = centroid[projectIndex.get(node.project) as number];
  c.x += graph.getNodeAttribute(i, 'x');
  c.y += graph.getNodeAttribute(i, 'y');
  c.files++;
});
const projectEdges = new Map<string, number>();
for (const [s, t] of raw.edges) {
  const a = projectIndex.get(raw.nodes[s].project) as number;
  const b = projectIndex.get(raw.nodes[t].project) as number;
  if (a !== b) projectEdges.set(`${a},${b}`, (projectEdges.get(`${a},${b}`) ?? 0) + 1);
}

const round = (v: number) => Math.round(v * 10) / 10;
const out = {
  name,
  layoutMs,
  projects: projects.map((p, i) => ({
    name: p,
    files: centroid[i].files,
    x: round(centroid[i].x / centroid[i].files),
    y: round(centroid[i].y / centroid[i].files),
  })),
  projectEdges: [...projectEdges].map(([k, w]) => [...k.split(',').map(Number), w]),
  // Compact node tuples: [path, projectIndex, kindInitial, x, y]
  nodes: raw.nodes.map((n, i) => [
    n.path,
    projectIndex.get(n.project),
    n.kind[0],
    round(graph.getNodeAttribute(i, 'x')),
    round(graph.getNodeAttribute(i, 'y')),
  ]),
  edges: raw.edges,
};

mkdirSync(join(dir, 'public', 'data'), { recursive: true });
writeFileSync(join(dir, 'public', 'data', `${name}.json`), JSON.stringify(out));
console.log(`${name}: ${raw.nodes.length} nodes, ${raw.edges.length} edges, ${projects.length} projects, FA2 ${iterations} it in ${layoutMs} ms`);
