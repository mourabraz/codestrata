# Plan

Each phase ends with a verifiable criterion, almost always against the fixture's [`fixtures/streaming-bff/EXPECTED.md`](../fixtures/streaming-bff/EXPECTED.md) or against the test repos (Hive, Twenty).

## Phase 0: Feasibility (done)

| Deliverable | Status |
|---|---|
| Fixture with the ground truth (`fixtures/streaming-bff`) | Done |
| Indexing spike: speed, precision, memory, TS 6 vs TS 7 (`spikes/indexing/REPORT.md`) | Done |
| Documentation: vision, features, architecture, data model, decisions, plan | Done (this set) |
| Base decisions: stack, layers, never running project code, first target, licence, language (ADRs 0004, 0005, 0008–0011) | Done |
| Project, npm package and command name: `codestrata` ([ADR 0012](adr/0012-name-codestrata.md)) | Done |
| Visualization spike: graph drawing engines and their limits (`spikes/visualization/REPORT.md`) | Done. Conclusion: the classic node-and-line graph is unreadable above ~300 nodes and cannot be the main view |
| Design exploration: prototype of the views on real data (`spikes/design/`) | Done: views validated ([ADR 0013](adr/0013-dashboard-design.md)); React + HTML/SVG + D3, with the graph view ready to come back ([ADR 0014](adr/0014-dashboard-technology.md)) |

**Closed on 2026-10-18.** The initial plan is closed and ADRs 0001–0014 are fixed: changing a decision now means a new ADR that supersedes the old one.

## Phase 1: Foundations and structural map

- The project monorepo (see the [proposed code layout](architecture.md#proposed-code-layout)), CI with lint and tests.
- `core` (graph model, IDs) and `storage` (SQLite, cache by hash).
- Layer 0 (Nx and pnpm workspaces) and layer 1 (oxc), with a bounded number of workers.
- CLI `analyze <path>` and a local server with a token.
- Minimal dashboard (React, [ADR 0014](adr/0014-dashboard-technology.md)): **Layers** and **Matrix** views, search, and **Usage** at file level (who imports, what is imported), with tests and generated files hidden by default.
- Cheap findings: import cycles, undeclared dependencies and test dependencies in production, unresolved imports.
- Detection of missing or incomplete dependencies and of Yarn PnP, with a warning in the dashboard.

**Exit criteria**
- Fixture: EXPECTED §1 and findings 4, 8 and 10 correct, in automated tests.
- Twenty: layer 1 in < 5 s (4 workers) on the reference machine (WSL2, 6 GB).
- Second run with no changes: < 1 s until the dashboard is ready.

## Phase 2: Type layer

- `TypeResolver` with the TS 6 API, in a child process with a heap limit, one program per project/tsconfig.
- Symbol → symbol calls and references, with provenance.
- **Usage** view at symbol level (the main use case), highlighting pieces with no use or used only by tests, and the **Areas** view.
- Prioritised by interest: what the user opens is resolved first.
- Watch mode with incremental updates.
- Type-based links in areas without installed dependencies marked as partial.
- Findings: dead code (exports never used) and pieces used only by tests.

**Exit criteria**
- Fixture: 100% of the calls in EXPECTED §3 linked correctly; findings 5 and 11 correct.
- Hive with dependencies: full analysis without exceeding 2.5 GB RSS and with ≥ 95% of member calls resolved.
- Editing a file: graph updated in < 1 s.

## Phase 3: GraphQL layer

- Schema from the `.graphql` files, with the owner of each type and field.
- Field ↔ resolver (codegen types and resolver maps), and the chain down to the external endpoint.
- Operations (persisted queries / documents) → fields → APIs: the **Trace** view.
- **Request flow** inside Usage (grouped flow, path and sequence), with inferred hops shown apart.
- Federation: subgraphs, entities, contributions; panel of shared services.
- Configurable string-keyed registries.

**Exit criteria**: fixture, EXPECTED §2 to §5 and findings 2, 6 and 7 correct.

## Phase 4: Analyses and rules

- Configurable architecture rules (layers, Nx tags, "resolvers don't call HTTP").
- Impact of a change.
- JSON/HTML export.

**Exit criteria**: fixture, all findings in EXPECTED §6 (1 to 11) correct.

## Phase 5: Release

- Global npm package, user documentation in English, examples.
- Check the licences of the dependencies bundled in the package ([ADR 0010](adr/0010-mit-license.md)).
- A test on a real project, if running the tool in that project's environment is allowed: everything local, no LLM.

## Later

- Local git history analysis (hotspots, temporal coupling).
- Yarn Plug'n'Play support in the type layer.
- TS 7 as `TypeResolver` once its API is stable (expected in 7.1); the spike measured a 4–7× gain.
- Other GraphQL styles (Apollo `dataSources`, NestJS, Pothos, graphql-modules).
- Java adapter.
- LLM features (opt-in, isolated).

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Memory of the type layer on large repos with dependencies | Analysis fails or the machine slows down | One program per project, child process with a heap limit, member calls only, TS 7 later |
| Missing or incomplete dependencies, even though they are required | ~40–60% precision in the affected areas | Don't block: full structural map, warning with the install command, links marked as partial |
| Projects using Yarn Plug'n'Play (no `node_modules`) | Type layer unavailable | Detect and warn; support later |
| Missing generated files | Broken imports, missing links | Detect through the codegen config, warn, run only with consent |
| Variety of patterns (DI, registries, GraphQL styles) | Missing links | Adapters and configuration; the fixture and real repos as regression tests |
| Changes in the TS 7 API | Rework | `TypeResolver` behind an interface; TS 6 stays supported |
| Old tsconfigs (`baseUrl`, `node10`) rejected by TS 7 | TS 7 unusable on those projects | Normalise the options in memory; keep TS 6 as a fallback |
| Graphs too large to draw | Unreadable or slow dashboard | Never draw everything: question-driven views, aggregation by folder/project, subgraphs |
| Running the analysed project's code | Security | Never install, run scripts or codegen without an explicit request |

## Open questions

| # | Question | Recommendation | Blocks |
|---|---|---|---|
| 1 | SQLite: `node:sqlite` (built into Node) or `better-sqlite3` | Check how stable `node:sqlite` is on the chosen minimum Node version | Phase 1 |
| 2 | Minimum Node version | The current LTS (24) | Phase 1 |

Resolved: dashboard design and technology ([0013](adr/0013-dashboard-design.md), [0014](adr/0014-dashboard-technology.md)), the name `codestrata` and the config file `codestrata.config.json` ([0012](adr/0012-name-codestrata.md)), the stack ([0004](adr/0004-stack-node-oxc-typescript.md)), reading the Nx config from files instead of `nx graph` ([0008](adr/0008-never-run-project-code.md)), licence ([0010](adr/0010-mit-license.md)), language ([0011](adr/0011-english-as-project-language.md)).
