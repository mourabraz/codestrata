import {
  type Dataset,
  egoView,
  fullView,
  largestProject,
  loadDataset,
  mostConnectedFile,
  projectFilesView,
  projectsView,
  type Scenario,
  type View,
} from './data';
import { layoutLayered } from './layout-elk';
import { createCytoscapeRenderer } from './render-cytoscape';
import { createSigmaRenderer } from './render-sigma';
import { createSigma3Renderer } from './render-sigma3';
import type { Renderer } from './renderer';

export type Lib = 'sigma' | 'sigma3' | 'cy-canvas' | 'cy-webgl';

export interface RunConfig {
  lib: Lib;
  dataset: string;
  scenario: Scenario;
  limit?: number;
  target?: number; // project index (project-files) or file index (ego)
}

export interface Metrics {
  lib: Lib;
  dataset: string;
  scenario: Scenario;
  nodes: number;
  edges: number;
  loadMs: number;
  buildMs: number;
  layoutMs: number;
  mountMs: number;
  heapMB?: number;
  fps?: number; // animation frames delivered per second during pan/zoom
  drawnFps?: number | null; // redraws per second reported by the library
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const stage = $<HTMLElement>('stage');
const datasets = new Map<string, Dataset>();
let renderer: Renderer | undefined;
let current: { config: RunConfig; view: View; ds: Dataset } | undefined;
let lastMetrics: Metrics | undefined;

function createRenderer(lib: Lib): Renderer {
  if (lib === 'sigma') return createSigmaRenderer();
  if (lib === 'sigma3') return createSigma3Renderer();
  return createCytoscapeRenderer(lib === 'cy-webgl');
}

function buildView(ds: Dataset, config: RunConfig): View {
  switch (config.scenario) {
    case 'projects':
      return projectsView(ds);
    case 'project-files':
      return projectFilesView(ds, config.target ?? largestProject(ds));
    case 'ego':
      return egoView(ds, config.target ?? mostConnectedFile(ds));
    case 'full':
      return fullView(ds, config.limit ?? 5000);
  }
}

const heapMB = () => {
  const memory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  return memory ? Math.round(memory.usedJSHeapSize / 1024 / 1024) : undefined;
};

async function run(config: RunConfig): Promise<Metrics> {
  renderer?.destroy();
  renderer = undefined;
  stage.innerHTML = '';

  let t = performance.now();
  let ds = datasets.get(config.dataset);
  if (!ds) {
    ds = await loadDataset(config.dataset);
    datasets.set(config.dataset, ds);
  }
  const loadMs = performance.now() - t;

  t = performance.now();
  const view = buildView(ds, config);
  const buildMs = performance.now() - t;

  t = performance.now();
  if (view.needsLayout) await layoutLayered(view);
  const layoutMs = performance.now() - t;

  const neighbours = new Map<string, Set<string>>();
  for (const e of view.edges) {
    if (!neighbours.has(e.source)) neighbours.set(e.source, new Set([e.source]));
    if (!neighbours.has(e.target)) neighbours.set(e.target, new Set([e.target]));
    neighbours.get(e.source)!.add(e.target);
    neighbours.get(e.target)!.add(e.source);
  }

  t = performance.now();
  const r = createRenderer(config.lib);
  renderer = r;
  await r.mount(stage, view, {
    onNodeClick: (id) => void drill(id),
    onNodeHover: (id) => r.highlight(id ? (neighbours.get(id) ?? new Set([id])) : null),
  });
  const mountMs = performance.now() - t;

  current = { config, view, ds };
  const round = (v: number) => Math.round(v);
  lastMetrics = {
    lib: config.lib,
    dataset: config.dataset,
    scenario: config.scenario,
    nodes: view.nodes.length,
    edges: view.edges.length,
    loadMs: round(loadMs),
    buildMs: round(buildMs),
    layoutMs: round(layoutMs),
    mountMs: round(mountMs),
    heapMB: heapMB(),
  };
  show(view.title, lastMetrics);
  return lastMetrics;
}

async function bench(ms = 3000): Promise<Metrics | undefined> {
  if (!renderer || !lastMetrics) return undefined;
  const { frames, drawn } = await renderer.benchmark(ms);
  lastMetrics.fps = Math.round((frames / ms) * 1000);
  lastMetrics.drawnFps = drawn === null ? null : Math.round((drawn / ms) * 1000);
  show(current?.view.title ?? '', lastMetrics);
  return lastMetrics;
}

/** Click navigation: project → its files; file → its ego view. */
async function drill(id: string) {
  if (!current) return;
  const node = current.view.nodes.find((n) => n.id === id);
  if (!node) return;
  const lib = current.config.lib;
  const dataset = current.config.dataset;
  if (node.kind === 'project' || node.kind === 'external') {
    await run({ lib, dataset, scenario: 'project-files', target: node.ref });
  } else {
    await run({ lib, dataset, scenario: 'ego', target: node.ref });
  }
}

function show(title: string, m: Metrics) {
  $('title').textContent = title;
  const rows: [string, string | number | undefined][] = [
    ['nodes / edges', `${m.nodes} / ${m.edges}`],
    ['load dataset (ms)', m.loadMs],
    ['build view (ms)', m.buildMs],
    ['layout ELK (ms)', m.layoutMs],
    ['mount → first frame (ms)', m.mountMs],
    ['JS heap (MB)', m.heapMB ?? 'n/a'],
    ['pan/zoom (fps)', m.fps ?? '—'],
    ['library redraws/s', m.drawnFps ?? '—'],
  ];
  $('metrics').innerHTML = rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
}

function formConfig(): RunConfig {
  return {
    lib: $<HTMLSelectElement>('lib').value as Lib,
    dataset: $<HTMLSelectElement>('dataset').value,
    scenario: $<HTMLSelectElement>('scenario').value as Scenario,
    limit: Number($<HTMLInputElement>('limit').value),
  };
}

$('render').addEventListener('click', () => void run(formConfig()));
$('bench').addEventListener('click', () => void bench());
$<HTMLInputElement>('search').addEventListener('keydown', async (event) => {
  if (event.key !== 'Enter') return;
  const config = formConfig();
  const ds = datasets.get(config.dataset) ?? (await loadDataset(config.dataset));
  datasets.set(config.dataset, ds);
  const query = (event.target as HTMLInputElement).value.toLowerCase();
  const target = ds.nodes.findIndex((n) => n[0].toLowerCase().includes(query));
  if (target >= 0) await run({ ...config, scenario: 'ego', target });
});

// Used by scripts/bench.ts through Playwright.
Object.assign(window, { spike: { run, bench } });

void run(formConfig());
