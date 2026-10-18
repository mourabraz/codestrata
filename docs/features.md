# Features

Priorities: **MVP** (first public release), **v1** (right after), **later** (when there is demand).
`EXPECTED §N` references point to the fixture section that serves as the acceptance test.

## Input and running

| Feature | Priority | Notes |
|---|---|---|
| `analyze <path>`: analyses a project on disk and opens the dashboard | MVP | The project should have its dependencies installed ([ADR 0002](adr/0002-node-cli-with-local-web-dashboard.md)) |
| Detection of missing or incomplete dependencies | MVP | Does not block: shows the structural map, warns with the install command and marks type-based links as partial |
| Detection of Yarn Plug'n'Play | MVP | Warns that the type layer does not support it yet |
| Automatic update when files change (watch) | v1 | The spike measured ~0.5 s per edit on Hive |
| Export the graph (JSON) and a static HTML page | v1 | To share without running the tool |
| CI report (findings as JSON/Markdown, exit code) | later | |
| Analyse by git URL (clone and install automatically) | out of scope | Cloning and installing is up to the user; that way the tool needs no network and never runs installs |

## Map

| Feature | Priority | Notes |
|---|---|---|
| Map of the monorepo's projects (Nx, pnpm/yarn/npm workspaces) | MVP | EXPECTED §1 |
| Drill-down: project → folder → file → symbol | MVP | |
| Search by file, symbol, type or GraphQL field name | MVP | |
| **Ego view** (Usage view): a piece with who uses it and what it uses, grouped by project | MVP | The use case that motivated the project ([ADR 0013](adr/0013-dashboard-design.md)) |
| **Request flow** of a piece: from the entries (HTTP → operation → schema field) to the exits (calls to external APIs), in three forms: grouped flow, linear path and sequence diagram | v1 | Needs layers 2 and 3. Inferred hops (framework, DataLoader, HTTP client wiring) are shown apart from calls in the code. Entries grouped by operation, expandable. The path and the sequence diagram show every intermediate step, without collapsing them. Validated in the design prototype |
| Filters: edge kind, tests, generated files, externals | MVP | **Test links and generated files hidden by default**: the map shows where pieces are used, not whether they are tested. Uses in tests appear only as a separate count |
| Provenance of each link (syntax, types, heuristic) | MVP | |
| Analysis status: layers done, precision, warnings | MVP | E.g. "dependencies not installed: partial precision" |
| Overlays on the map: size, complexity, git churn | later | |
| Link to open the file in the editor (`vscode://`, etc.) | v1 | |

## GraphQL layer (first framework adapter)

First supported style: **schema-first** with `.graphql` + `@graphql-tools` (module merge) + GraphQL Code Generator, including Federation.

| Feature | Priority | Notes |
|---|---|---|
| Full schema from the project's `.graphql` files, with the module that owns each type/field | MVP | EXPECTED §2 |
| Field ↔ resolver link (through the codegen types and the resolver maps) | MVP | EXPECTED §3 |
| Chain field → resolver → service → retriever → external call | MVP | EXPECTED §3 |
| Operations (persisted queries, client `.graphql` documents) → fields → external APIs | v1 | EXPECTED §5. Its own view (Trace), separate from the request flow, which starts from a piece rather than an operation |
| Federation: subgraphs, `@key` entities, who contributes which fields | v1 | EXPECTED §2 |
| Federation migration panel: services shared between modules | v1 | EXPECTED §6, finding 2 |
| GraphQL clients for external backends (operations sent) | v1 | |
| Configurable string-keyed registries (e.g. CMS mappers) | v1 | EXPECTED §4 |
| Other styles: Apollo `dataSources`, NestJS code-first, Pothos, graphql-modules | later | |

## Analyses (findings)

| Feature | Priority | Notes |
|---|---|---|
| Import cycles | MVP | Finding 4 |
| Dead code: exports never imported | MVP | Finding 5 |
| **Used only by tests**: pieces with tests but no real use, highlighted on the map | MVP | Finding 11. In published packages, public exports (`exports` in `package.json`) may be used outside the repo: flag them instead of calling them dead |
| Undeclared dependencies and test dependencies used in production | MVP | Findings 8 and 10 |
| Unresolved imports and missing generated files | MVP | Warns and suggests running the codegen |
| Configurable architecture rules (layers, Nx tags, "resolvers don't call HTTP") | v1 | Findings 1 and 3 |
| Schema fields no operation uses; deprecated fields still resolved | v1 | Findings 6 and 7 |
| Impact of a change (what is affected if X changes) | v1 | |
| Hotspots: git churn × complexity, temporal coupling | later | |

## Optional, with an LLM (isolated, opt-in)

| Feature | Priority | Notes |
|---|---|---|
| Summary of a module or a flow | later | Only when explicitly enabled; should support local models |
| Natural-language questions about the graph | later | Sends the graph and chosen excerpts, never the whole repo without consent |

## Languages

| Language | Priority |
|---|---|
| TypeScript / JavaScript | MVP |
| Java | later (its own adapter, see [ADR 0003](adr/0003-typescript-first-language-agnostic-model.md)) |
