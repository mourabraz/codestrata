// Dataset loading and the view models for each dashboard scenario.

export interface Dataset {
  name: string;
  projects: { name: string; files: number; x: number; y: number }[];
  projectEdges: [number, number, number][];
  nodes: [path: string, project: number, kind: string, x: number, y: number][];
  edges: [number, number][];
  out: number[][]; // adjacency: file -> files it imports
  in: number[][]; // reverse adjacency: file -> files that import it
}

export interface ViewNode {
  id: string;
  label: string;
  x: number;
  y: number;
  size: number;
  color: string;
  ref: number; // file index or project index, depending on the view
  kind: 'file' | 'project' | 'external';
}

export interface ViewEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
}

export interface View {
  title: string;
  scenario: Scenario;
  nodes: ViewNode[];
  edges: ViewEdge[];
  directed: boolean;
  showAllLabels: boolean;
  needsLayout: boolean; // true when positions must come from ELK
  focus?: string;
}

export type Scenario = 'projects' | 'project-files' | 'ego' | 'full';

export async function loadDataset(name: string): Promise<Dataset> {
  const raw = (await (await fetch(`/data/${name}.json`)).json()) as Omit<Dataset, 'out' | 'in'>;
  const out: number[][] = raw.nodes.map(() => []);
  const inn: number[][] = raw.nodes.map(() => []);
  for (const [s, t] of raw.edges) {
    out[s].push(t);
    inn[t].push(s);
  }
  return { ...raw, out, in: inn };
}

/** Distinct hue per project (golden angle), as hex: sigma 4 does not parse hsl() colors. */
export function projectColor(index: number): string {
  const h = ((index * 137.508) % 360) / 360;
  const s = 0.62;
  const l = 0.52;
  const hue2rgb = (p: number, q: number, t: number) => {
    const u = (t + 1) % 1;
    if (u < 1 / 6) return p + (q - p) * 6 * u;
    if (u < 1 / 2) return q;
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${hex(hue2rgb(p, q, h + 1 / 3))}${hex(hue2rgb(p, q, h))}${hex(hue2rgb(p, q, h - 1 / 3))}`;
}

const basename = (path: string) => path.split('/').pop() ?? path;
const shortProject = (name: string) => name.split('/').slice(-1)[0];

export function projectsView(ds: Dataset): View {
  const nodes = ds.projects.map((p, i) => ({
    id: `p${i}`,
    label: `${shortProject(p.name)} (${p.files})`,
    x: p.x,
    y: p.y,
    size: 4 + Math.sqrt(p.files),
    color: projectColor(i),
    ref: i,
    kind: 'project' as const,
  }));
  const edges = ds.projectEdges.map(([s, t, w]) => ({ id: `pe${s}-${t}`, source: `p${s}`, target: `p${t}`, weight: w }));
  return { title: `${ds.name}: projects`, scenario: 'projects', nodes, edges, directed: true, showAllLabels: true, needsLayout: false };
}

export function projectFilesView(ds: Dataset, project: number): View {
  const files = ds.nodes.flatMap((n, i) => (n[1] === project ? [i] : []));
  const inProject = new Set(files);
  const kindColor: Record<string, string> = { s: projectColor(project), t: '#94a3b8', g: '#f59e0b' };
  const nodes: ViewNode[] = files.map((i) => ({
    id: `f${i}`,
    label: basename(ds.nodes[i][0]),
    x: ds.nodes[i][3],
    y: ds.nodes[i][4],
    size: 2 + Math.sqrt(ds.out[i].length + ds.in[i].length) * 0.8,
    color: kindColor[ds.nodes[i][2]] ?? '#64748b',
    ref: i,
    kind: 'file',
  }));
  const edges: ViewEdge[] = [];
  const external = new Map<number, number>(); // other project -> number of imports
  for (const i of files) {
    for (const j of ds.out[i]) {
      if (inProject.has(j)) edges.push({ id: `e${i}-${j}`, source: `f${i}`, target: `f${j}`, weight: 1 });
      else external.set(ds.nodes[j][1], (external.get(ds.nodes[j][1]) ?? 0) + 1);
    }
  }
  // External projects sit on a ring around the project's files, with one aggregated edge each.
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const r = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 0.75 + 50;
  [...external].forEach(([p, count], k) => {
    const angle = (2 * Math.PI * k) / external.size;
    nodes.push({
      id: `p${p}`,
      label: `→ ${shortProject(ds.projects[p].name)} (${count})`,
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      size: 6,
      color: '#cbd5e1',
      ref: p,
      kind: 'external',
    });
    for (const i of files) {
      if (ds.out[i].some((j) => ds.nodes[j][1] === p)) edges.push({ id: `x${i}-${p}`, source: `f${i}`, target: `p${p}`, weight: 1 });
    }
  });
  return {
    title: `${ds.name}: ${ds.projects[project].name} (${files.length} files)`,
    scenario: 'project-files',
    nodes,
    edges,
    directed: true,
    showAllLabels: false,
    needsLayout: false,
  };
}

/** The ego view: who imports this file (left) and what it imports (right), up to `hops` levels each way. */
export function egoView(ds: Dataset, file: number, hops = 2, cap = 300): View {
  const level = new Map<number, number>([[file, 0]]);
  const walk = (next: number[][], sign: number) => {
    let frontier = [file];
    for (let h = 1; h <= hops && level.size < cap; h++) {
      const nextFrontier: number[] = [];
      for (const i of frontier) {
        for (const j of next[i]) {
          if (level.has(j) || level.size >= cap) continue;
          level.set(j, sign * h);
          nextFrontier.push(j);
        }
      }
      frontier = nextFrontier;
    }
  };
  walk(ds.out, 1);
  walk(ds.in, -1);

  const nodes: ViewNode[] = [...level].map(([i, l]) => ({
    id: `f${i}`,
    label: `${shortProject(ds.projects[ds.nodes[i][1]].name)}/${basename(ds.nodes[i][0])}`,
    x: 0,
    y: 0,
    size: i === file ? 10 : 5,
    color: i === file ? '#e11d48' : l < 0 ? '#2563eb' : projectColor(ds.nodes[i][1]),
    ref: i,
    kind: 'file',
  }));
  const edges: ViewEdge[] = [];
  for (const i of level.keys()) {
    for (const j of ds.out[i]) if (level.has(j)) edges.push({ id: `e${i}-${j}`, source: `f${i}`, target: `f${j}`, weight: 1 });
  }
  return {
    title: `${ds.name}: ego of ${ds.nodes[file][0]}`,
    scenario: 'ego',
    nodes,
    edges,
    directed: true,
    showAllLabels: true,
    needsLayout: true,
    focus: `f${file}`,
  };
}

/** The whole file graph (or the `limit` most connected files): a stress test, not a real dashboard view. */
export function fullView(ds: Dataset, limit: number): View {
  const order = ds.nodes.map((_, i) => i);
  if (limit < order.length) order.sort((a, b) => ds.out[b].length + ds.in[b].length - (ds.out[a].length + ds.in[a].length));
  const kept = order.slice(0, limit);
  const keep = new Set(kept);
  const nodes: ViewNode[] = kept.map((i) => ({
    id: `f${i}`,
    label: basename(ds.nodes[i][0]),
    x: ds.nodes[i][3],
    y: ds.nodes[i][4],
    size: 1.5 + Math.sqrt(ds.out[i].length + ds.in[i].length) * 0.5,
    color: projectColor(ds.nodes[i][1]),
    ref: i,
    kind: 'file',
  }));
  const edges: ViewEdge[] = [];
  for (const i of kept) for (const j of ds.out[i]) if (keep.has(j)) edges.push({ id: `e${i}-${j}`, source: `f${i}`, target: `f${j}`, weight: 1 });
  return {
    title: `${ds.name}: ${kept.length} files, ${edges.length} imports`,
    scenario: 'full',
    nodes,
    edges,
    directed: false,
    showAllLabels: false,
    needsLayout: false,
  };
}

export function mostConnectedFile(ds: Dataset): number {
  let best = 0;
  ds.nodes.forEach((_, i) => {
    if (ds.in[i].length > ds.in[best].length) best = i;
  });
  return best;
}

export function largestProject(ds: Dataset): number {
  let best = 0;
  ds.projects.forEach((p, i) => {
    if (p.files > ds.projects[best].files) best = i;
  });
  return best;
}
