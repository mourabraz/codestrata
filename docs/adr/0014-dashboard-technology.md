# 0014. Dashboard technology: React, HTML/SVG and D3

- Status: Accepted
- Date: 2026-10-18

## Context

The views defined in [0013](0013-dashboard-design.md) are structured: layers, columns, lists, tables, a matrix, an area map and small diagrams. The prototype built all of them with HTML, CSS and SVG, and only used D3 to compute the area map. None of them needs a graph engine. The dashboard has state (selection, filters, navigation, live updates during the analysis), so it needs a component framework.

## Decision

- **React** for the dashboard (a SPA served by the CLI, [0002](0002-node-cli-with-local-web-dashboard.md)).
- **HTML/CSS + SVG** to draw the views, with **D3** modules where there is computation (`d3-hierarchy`, `d3-scale`, …), not the whole of D3.
- **ELK** (in a Web Worker) for automatic layered layouts, if a view needs one.
- **The graph view may come back at any time.** For that:
  - each view is an isolated component, with its drawing engine inside it;
  - the server returns subgraphs and aggregates, which serve the current views as well as a graph;
  - the option already studied for drawing graphs is **Sigma.js 3 + graphology + ELK** ([visualization spike](../../spikes/visualization/REPORT.md)), with the rule of never drawing thousands of nodes without aggregation.

## Consequences

- No WebGL dependency in the MVP; the dashboard works in any browser and is easy to test.
- Adding a graph view means adding a component and an API route, without touching the other views.
- React is the framework most potential contributors know.
