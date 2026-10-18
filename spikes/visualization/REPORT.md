# Spike: drawing the graph in the dashboard

> **Outcome (2026-10-18):** for the MVP the dashboard does not use a graph engine. The question-driven views ([ADR 0013](../../docs/adr/0013-dashboard-design.md)) are drawn with HTML/SVG + D3 ([ADR 0014](../../docs/adr/0014-dashboard-technology.md)). The recommendation below (Sigma.js 3) remains the option if a graph view comes back.

**Question:** which library should draw the graph in the dashboard, smoothly in the views codestrata needs (projects, drill-down, ego view), without breaking on large repos?

**Short answer: Sigma.js 3 (WebGL), with ELK for hierarchical layouts.** For small views every candidate works. At scale (5k to 33k nodes), Sigma stays usable while Cytoscape drops to 1–2 fps, with 3–5× more memory. Between the two Sigma versions, v3 mounts 2–3× faster, uses less memory and has been stable for almost a year, while v4 came out 10 days ago. The spike also showed that **no engine makes a graph of thousands of files readable**: the dashboard has to aggregate (folders, projects) instead of drawing everything.

## Method

- **Real data**: the file-level import graph, exported with oxc (`spikes/indexing/src/export-graph.ts`):
  - Hive: 2,092 files, 5,969 imports;
  - Twenty: 33,122 files, 115,797 imports.
- **Precomputed positions** with ForceAtlas2 (`scripts/layout.ts`), the same for every engine. Ego views use **ELK**'s layered layout (importers on the left, imported on the right).
- **Candidates**: Sigma.js 4.0.3 and Sigma.js 3.0.2 (WebGL), Cytoscape.js 3.34.4 with canvas and with its WebGL renderer (`webgl` option).
- **Scenarios**:
  - projects;
  - project → files (the largest project);
  - ego view (the most imported file, up to 2 levels, capped at 300 nodes);
  - the whole graph, as a stress test.
- **Measurement** (`scripts/bench.ts`): headless Chromium through Playwright, **software WebGL (SwiftShader)**, a 1400×900 window. For each case: time to first frame, JS heap, frames per second during 3 s of pan/zoom, and a screenshot.
- Machine: WSL2, 16 vCPU, 6 GB.

> **About FPS:** without a GPU, WebGL is emulated on the CPU. That penalises Sigma and Cytoscape WebGL against 2D canvas, so the FPS below do not represent a browser with a GPU. **Mount times and memory** are JavaScript work and are comparable.

## Results

Time to first frame / JS heap / fps during pan/zoom (software):

| Scenario | Nodes / edges | Sigma | Cytoscape canvas | Cytoscape WebGL |
|---|---|---|---|---|
| Hive: projects | 34 / 78 | 80 ms / 34 MB / 60 | 84 ms / 39 MB / 60 | 108 ms / 38 MB / 46 |
| Hive: project → files | 696 / 2,608 | **150 ms** / 40 MB / 21 | 595 ms / 50 MB / 45 | 429 ms / 67 MB / 17 |
| Hive: ego view | 300 / 914 | **181 ms** / 51 MB / 22 | 482 ms / 60 MB / 57 | 641 ms / 63 MB / 17 |
| Hive: whole graph | 2,092 / 5,969 | **311 ms** / 49 MB / 14 | 742 ms / 85 MB / 41 | 616 ms / 89 MB / 15 |
| Twenty: project → files | 12,137 / 51,733 | **1.1 s** / 179 MB / 10 | 4.1 s / 360 MB / 2 | 3.9 s / 318 MB / 3 |
| Twenty: 5,000 files | 5,000 / 32,074 | **0.8 s** / 128 MB / 10 | 3.2 s / 260 MB / 5 | 2.0 s / 234 MB / 5 |
| Twenty: 20,000 files | 20,000 / 94,555 | **2.4 s** / 303 MB / 9 | 9.2 s / 614 MB / 1 | 6.1 s / 544 MB / 2 |
| Twenty: whole graph | 33,122 / 115,797 | **2.4 s** / 263 MB / 9 | 9.9 s / 809 MB / 1 | 7.7 s / 716 MB / 2 |

Sigma 3 vs Sigma 4 (same measurement; a separate run, so the Sigma 4 numbers differ slightly from the table above):

| Scenario | Sigma 4.0.3 | Sigma 3.0.2 |
|---|---|---|
| Hive: project → files (696 / 2,608) | 129 ms / 41 MB / 21 fps | **70 ms / 36 MB** / 11 fps |
| Hive: ego view (300 / 914) | 191 ms / 53 MB / 19 fps | **156 ms / 48 MB** / 18 fps |
| Hive: whole graph (2,092 / 5,969) | 328 ms / 50 MB / 13 fps | **100 ms / 40 MB** / 9 fps |
| Twenty: project → files (12,137 / 51,733) | 1.1 s / 179 MB / 10 fps | **0.4 s / 107 MB** / 5 fps |
| Twenty: whole graph (33,122 / 115,797) | 2.6 s / 264 MB / 9 fps | **1.4 s / 158 MB** / 5 fps |

Sigma 4 draws more frames with emulated WebGL (more efficient rendering); with a real GPU both versions should be close to 60 fps at these sizes, which manual validation should confirm. Readability is equivalent: both avoid overlapping labels.

npm dates: Sigma 3.0.0 on 2024-12-12 (3.0.2 on 2025-05-27); **Sigma 4.0.0 on 2026-10-08**, followed by three patches within a week.

Other timings:

- **ELK (layered layout) for a 300-node ego view: 0.7–1.1 s** on the main thread.
- **ForceAtlas2 on Twenty's whole graph: ~30 s** in Node (Hive: 2.8 s).

## What we learned

**About the engines**

- **Sigma** (3 and 4) scales well and has **non-overlapping labels** (a density grid), which makes a big difference to readability. Version 4 brought declarative styles with states (`isHighlighted`, `isHovered`), well suited to highlighting neighbours. Pitfalls found in v4:
  - it only accepts hex/RGB colours (`hsl()` renders black);
  - sizes are in graph units by default (`itemSizesReference: 'positions'`), which makes nodes vanish in layouts with large coordinates;
  - most of the documentation is still for v3.
- **Cytoscape** has more layouts and compound nodes (useful to group by folder), and its canvas renderer is smooth up to a few thousand elements. Above ~5,000 nodes it degrades badly in time and memory, and labels overlap. The WebGL renderer helped little and emits no render events.

**About the dashboard (whatever the engine)**

1. **Don't draw thousands of files.** A project with 12k files becomes a hairball in any engine. Drill-down should go **project → aggregated folders → files**, with counts and expansion on demand.
2. **Ego views of heavily imported files also need aggregation**: group neighbours by folder or project once there are more than a few dozen, and expand on demand.
3. **ELK should run in a Web Worker** (0.7–1 s would freeze the UI) and with a size cap.
4. **Force layouts of the whole repo are computed in the background and cached**, or replaced by layouts based on the folder structure, which are cheap and stable across runs.

## Recommendation

- **Sigma.js 3** to draw, **graphology** for the graph model in the browser (neighbourhoods, filters), **ELK in a Web Worker** for layered layouts.
  - It is stable, documented and has an official React wrapper (`@react-sigma`).
  - It mounts faster and uses less memory than Sigma 4.
- **Revisit Sigma 4 later** (for example at release time), once it has settled. Declarative styles with states and node *backdrops* (useful to draw groups) are attractive, but the version is 10 days old and the documentation is still mostly for v3. Migration stays contained if drawing is isolated in our own component.
- Aggregation by folder and project is done by codestrata (server or client), not by the engine.

## Manual validation (recommended)

The measured FPS come from software WebGL. To feel the real smoothness, with a GPU:

```bash
cd spikes/visualization && pnpm install && pnpm dev
# open http://127.0.0.1:5173 in the browser (on WSL, the Windows browser works)
```

On the page you choose the engine, the dataset and the view. Clicking a project drills down, clicking a file opens its ego view, and hovering highlights neighbours. "Pan/zoom 3 s" measures FPS.

## How to reproduce

```bash
# 1. export the graphs (needs the clones in spikes/indexing/.repos)
cd spikes/indexing && node src/export-graph.ts .repos/hive ../visualization/data/hive.raw.json
# 2. compute the positions
cd ../visualization && pnpm install && node scripts/layout.ts hive
# 3. headless benchmark (installs Playwright's Chromium the first time: npx playwright install chromium)
node scripts/bench.ts hive twenty
```

Results and screenshots go to `results/` (ignored by git).
