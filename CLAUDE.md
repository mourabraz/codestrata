# codestrata

An open source, local tool that analyses a software project on disk (dependencies installed) and serves a web dashboard with a navigable, question-driven map of the code: projects, files, symbols, who uses what, and GraphQL request flows. The local folder is still called `project-analyzer` (the initial working name).

## Current state (as of 2026-10-18)

- **Phase 0 (feasibility) is done**: fixture, spikes, documentation and the initial plan are closed. **Next: phase 1** in `docs/plan.md` (foundations and structural map).
- Before scaffolding phase 1, decide the two open questions in `docs/plan.md` (SQLite: `node:sqlite` vs `better-sqlite3`; minimum Node version) and record each as a new ADR.
- Git: initialised on 2026-10-18 (branch `main`, remote `origin` = `github.com/mourabraz/codestrata`); the first commit was still pending at that date.
- GitHub repo settings are applied (public, description/topics, squash-only merges, secret scanning + push protection, Dependabot alerts, private vulnerability reporting, approval required for all external contributors' workflows, read-only workflow token). **Pending after the first push**: the `main` ruleset in `.github/rulesets/main.json` (no deletion, no force push, PRs required with 0 approvals because a sole maintainer cannot approve their own PRs, squash only). Apply it with `gh api -X POST repos/mourabraz/codestrata/rulesets --input .github/rulesets/main.json`. When CI exists (phase 1), add its checks to this ruleset as required status checks.
- Name reserved: npm package `codestrata` (placeholder `0.0.0-stage`), npm org `@codestrata`, GitHub repo `mourabraz/codestrata`.

## Where things are

- `docs/`: the source of truth (index in `docs/README.md`): vision, features, architecture, data model, plan.
- `docs/adr/`: decisions. **ADRs 0001–0014 are accepted and fixed**: never rewrite one; a changed decision is a new ADR that supersedes it. Don't duplicate decisions in this file.
- `fixtures/streaming-bff/`: fictional pnpm + Nx GraphQL BFF monorepo; `EXPECTED.md` is the ground truth (acceptance tests per phase). Any fixture change must update `EXPECTED.md`. Verify with `pnpm gen && pnpm typecheck && pnpm test && pnpm exec biome check .`; end to end: `pnpm start:mocks`, `pnpm start:bff`, `pnpm smoke`.
- `spikes/` (throwaway, not part of the app):
  - `indexing/`: oxc + TS checker measurements (`REPORT.md`) and the extractors `export-graph.ts`, `export-usage.ts`, `export-flow.ts`. `.repos/` holds shallow clones of graphql-hive/console (with `node_modules` installed) and twentyhq/twenty (gitignored, ~2.5 GB).
  - `visualization/`: graph engine comparison (`REPORT.md`); Playwright + headless Chromium are installed here and its `scripts/shot-*.mjs` take screenshots.
  - `design/`: the validated dashboard prototype (`prototype.html`, the visual reference for phase 1), published privately at https://claude.ai/artifact/78XWkDN4Kfy1s844sBEBnd. Rebuild steps in its `README.md`.

## Conventions

- **Language**: code, comments, documentation, commit messages and CLI/UI text are always in English (ADR 0011).
- **Privacy**: never add code, names or details from private projects (ADR 0001). The motivating use case is a private project; describe its patterns only generically (see below), and develop against the fixture and open source repos.
- **Decisions**: record them in ADRs; the initial ones (0001–0014) are fixed.
- **Dashboard design** (ADR 0013): question-driven views (Layers, Usage + Request flow, Trace, Matrix, Areas); tests and generated files hidden by default; inferred links always shown apart; the node-and-line graph is never the main view but may come back. Technology (ADR 0014): React + HTML/SVG + D3; each view is an isolated component so a graph view (Sigma.js 3 + graphology + ELK) can be added later.

## Reference use case (generic description)

A pnpm + Nx monorepo (~20 packages): a schema-first GraphQL BFF migrating from a modular monolith to Apollo Federation. Patterns the tool must understand:

- **GraphQL modules per domain**, each exporting the same contract: `typedefs` (loads a `.graphql` with `@graphql-tools/load-files`), `resolvers` (per-type map), a context extension builder (creates the module's services) and CMS mapper registrations.
- **A monolith app** merging all modules (`mergeTypeDefs`/`mergeResolvers`) on Envelop (not Apollo Server). Some modules also run as **subgraphs**, composed into a supergraph (`rover supergraph compose`) served by Apollo Router.
- **Federation** (`@key`, `extend type`): the migration replaces services shared between modules with entity references through schema composition.
- **Codegen** (GraphQL Code Generator): per-module schema types, prefixed resolver types and typed context; also typed clients for external GraphQL backends. Generated files are never edited by hand.
- **Lazy per-request context** (Proxy) with injected services, composed from the common context plus each module's extension. No Apollo `dataSources`.
- **Call chain**: resolver → service (DataLoader, LRU cache, mapping to domain types) → retriever (thin function) → typed REST/RPC client or GraphQL client (queries built from fragments). Resolvers never call APIs directly.
- **Global identification by URN**: entities return other entities only as `{ urn }` pointers.
- **Architecture rule**: layout types may point to domain types, never the reverse.
- **String-keyed registries**: `registerXMapper("document_type", mapper)` links CMS document types to layout elements.
- **Persisted queries only** in production. Some apps are not TS (a Rust gateway, a Docusaurus site).
