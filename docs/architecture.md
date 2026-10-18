# Architecture

> Based on the indexing spike ([`spikes/indexing/REPORT.md`](../spikes/indexing/REPORT.md)). The stack described here is [ADR 0004](adr/0004-stack-node-oxc-typescript.md) (accepted).

## Overview

```
 codestrata analyze <path>
        │
        ▼
┌───────────────────────────────── main process (Node) ─────────────────────────────────┐
│  CLI ─► Orchestrator ─► work queue by layer ─► Graph (SQLite) ◄─ Analyses               │
│                │                                     ▲                                  │
│                │                                     │ queries                          │
│                ▼                                     │                                  │
│        Local HTTP server (127.0.0.1) ── REST + events (SSE) ──► Web dashboard (SPA)     │
└────────────────┬───────────────────────────────────────────────────────────────────────┘
                 │ child processes (isolated memory, can be restarted)
     ┌───────────┼──────────────────────┬──────────────────────────┐
     ▼           ▼                      ▼                          ▼
 Layer 0      Layer 1                Layer 2                    Layer 3
 workspace    structure (oxc)        types (TS checker)         frameworks (GraphQL…)
```

## Analysis layers

Each layer writes to the graph as soon as it finishes, and the dashboard updates. The user sees something useful within seconds, and precision improves in the background.

| Layer | What it produces | Engine | Cost measured in the spike |
|---|---|---|---|
| **0. Workspace** | Projects, tags, declared dependencies, tsconfigs | Reading `package.json`, `pnpm-workspace.yaml`, `project.json`, `nx.json` | Negligible |
| **1. Structure** | Files, imports/exports, module resolution, top-level declarations | oxc-parser + oxc-resolver, up to ~4 workers | Twenty (33k files): ~3 s |
| **2. Types** | Symbol → symbol references and calls, including `obj.method()` | The TypeScript type checker (TS 6 today, TS 7 later) | Hive with deps: ~37 s the first time, ~0.5 s per edit |
| **3. Frameworks** | GraphQL schema, field ↔ resolver, operations, Federation, string-keyed registries | graphql-js + the graph from layers 1 and 2 | Not measured yet |
| **Analyses** | Findings (cycles, dead code, rules…) | Queries over the graph | Not measured yet |

Rules that came out of the spike:

- **Layer 1 does not walk the AST in JavaScript.** It uses the module information oxc computes in Rust. Walking the AST in JS took ~65% of the time.
- **Layer 2 only resolves what layer 1 cannot**: member calls (`a.b()`) and references that depend on types. Calls to imported functions are already resolved by the import graph.
- **Layer 2 is prioritised by interest**: the area the user opened in the dashboard (for example the Usage view of a symbol) is resolved first.

## Adapters

The core knows no languages or frameworks. It knows interfaces:

```ts
interface WorkspaceAdapter {   // nx, pnpm/yarn/npm workspaces, single project
  detect(root): boolean;
  projects(root): Project[];
}

interface LanguageAdapter {    // typescript (MVP), java (later)
  detect(project): boolean;
  structurePass(files): StructureResult;           // layer 1
  typePass(scope, priority): AsyncIterable<Edge>;   // layer 2
}

interface TypeResolver {       // TS 6 implementation today, TS 7 once it has an API
  openProgram(tsconfig, files): ProgramHandle;
  update(changedFiles): void;
  resolveCallsIn(file): Edge[];
}

interface FrameworkAdapter {   // graphql-schema-first (MVP)
  detect(graph): boolean;
  analyse(graph): GraphDelta;                        // layer 3
}
```

Patterns specific to a project (for example `registerXMapper("type", fn)`) come in through **configuration** (`codestrata.config.json` at the root of the analysed project, or in the dashboard), not through code in the core.

## Processes and memory

- **The main process** holds the CLI, the orchestrator, the server and access to the graph. It is light.
- **Each heavy layer runs in a child process** with its own heap limit. A large repo cannot take the dashboard down, and a process can be restarted to free memory.
- **Layer 2: one TS program per project/tsconfig**, not one for the whole repo (on Hive a single program peaked at 3.3 GB). By default only one program is active at a time, and the heap limit is derived from total RAM. Results are cached, so the program can be discarded.
- **Layer 1 workers**: at most 4 by default. More workers barely help and multiply memory.

## Cache and incremental updates

- One cache folder per analysed project: `~/.cache/codestrata/<hash of the absolute path>/` (XDG on Linux, the equivalent on macOS/Windows). **Nothing is written inside the analysed repository.**
- The graph and the state of each file (content hash and layers applied) live in a SQLite database.
- A new run only reprocesses files whose hash changed, and what depends on them.
- In watch mode, layer 2 reuses the previous program (`oldProgram`). The spike measured 0.2 s to rebuild and 0.26 s to resolve the edited file again.

## Dependencies and generated files

- **Requirement: the project is on disk, with its dependencies installed** ([ADR 0002](adr/0002-node-cli-with-local-web-dashboard.md)). It is the normal state of a project you are working on, and it gives layer 2 the precision measured in the spike (95–100%; without `node_modules` it drops to ~40–60%).
- **If dependencies are missing or incomplete** (for example, only part of a monorepo installed), the analysis **does not block**: layers 0 and 1 run normally, the dashboard shows a warning with the install command, and type-based links in the affected areas are marked as partial. The tool never installs dependencies ([ADR 0008](adr/0008-never-run-project-code.md)).
- **Yarn Plug'n'Play** (no `node_modules`): it is detected and the dashboard warns that layer 2 does not support it yet. Layers 0 and 1 work.
- **Missing generated files** (codegen not run): detected as imports of files that do not exist and match the codegen config. The tool warns and suggests the command. It only runs it if the user explicitly asks.
- **Generated files present** (`*.generated.ts`, printed schemas, supergraph): used as a source of types and hidden from the map by default.

## Server and dashboard

- The HTTP server listens **only on 127.0.0.1**. It checks the `Host` header and uses a session token in the URL, so other pages open in the browser cannot read the graph.
- A JSON REST API for queries (search, node, neighbours with depth and filters, findings, operation traces) and **events (SSE)** for layer progress.
- The dashboard is a **React** SPA served by the package itself, with question-driven views ([ADR 0013](adr/0013-dashboard-design.md)) drawn in **HTML/SVG + D3** ([ADR 0014](adr/0014-dashboard-technology.md)). **It never draws the whole graph**: it asks the server for aggregates and subgraphs (by project, folder, neighbourhood, operation).
- Each view is an isolated component with its own drawing engine, so a **graph view** can come back without touching the others (option studied: Sigma.js 3 + graphology + ELK).
- No telemetry and **no network requests at all**.

## LLM features

They live in a separate package, off by default. The core does not depend on it. See [ADR 0006](adr/0006-optional-isolated-llm.md).

## Proposed code layout

pnpm monorepo:

```
packages/
  core/                 graph model, IDs, adapter interfaces
  storage/              SQLite: graph, file state, findings
  workspace/            workspace adapters (nx, pnpm, yarn, npm)
  lang-typescript/      layer 1 (oxc) and layer 2 (TS 6 TypeResolver)
  framework-graphql/    layer 3 for schema-first GraphQL
  analyses/             findings
  server/               HTTP + SSE
  web/                  dashboard (React; views in HTML/SVG + D3)
  cli/                  `codestrata` command, orchestrator
fixtures/streaming-bff/ fixture with the ground truth (EXPECTED.md)
spikes/                 throwaway experiments
docs/                   this documentation
```
