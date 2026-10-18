# Spike: indexing feasibility

**Question:** with a Node/TS stack, can we index a large TypeScript monorepo fast enough for the tool to be useful, and precisely enough to link resolvers to services?

**Short answer: yes, with conditions.** The structural pass (oxc) is fast even on 33k files. The type pass (TS 6 API) is precise (95–100%) when the project's dependencies are installed, but the first run costs tens of seconds and a few GB of memory. Updates after an edit cost under half a second. TS 7 is 4–7× faster, but has no API yet.

## Environment

- WSL2, 16 vCPU, **6 GB RAM** (about 4 GB free), Node 24.13.
- TypeScript 6.0.3 (JS API), TypeScript 7.0.2 (native, CLI only), oxc-parser 0.154.0, oxc-resolver 11.24.2.
- Repos: the `streaming-bff` fixture; `graphql-hive/console` @ `335bf6a` (2026-10-17); `twentyhq/twenty` @ `dd7099a` (2026-10-18). Shallow clones and, unless stated otherwise, **without `node_modules`**.
- Timings vary ±30% between runs (WSL disk cache). Tables show the best of 2–3 runs.

## 1. Fast pass (oxc: parsing + imports/exports + module resolution)

It only uses the module information oxc computes in Rust, without walking the AST in JavaScript.

| Repo | Files | Source | 1 thread | 1 thread (raw transfer) | 4 workers | 8 workers |
|---|---|---|---|---|---|---|
| fixture | 79 | <1 MB | **27 ms** | 74 ms | — | — |
| Hive | 2,092 | 11 MB | 669 ms | 721 ms | **389 ms** | 368 ms |
| Twenty | 33,122 | 102 MB | 19.2 s (2.3 GB)* | **6.8 s (478 MB)** | **3.2 s (2.6 GB)** | 2.6 s (2.7 GB) |

\* Without raw transfer and on a single thread, memory piles up (GC). With raw transfer it stays stable.

- **Walking the AST in JS is the bottleneck**: on Twenty, the visit to classify calls alone costs ~9 s of ~14 s. The fast pass must not walk the AST in JS.
- **Parallelism**: 4 workers give ~2× on Twenty, at the cost of memory. More than 4 workers barely help.
- **Internal import resolution**: fixture 176/176; Twenty 116,545/116,558 (13 failures in templates and `.mjs`). On Hive 671 fail, almost all of them **codegen-generated files that are not in the repository** (`./gql`).
- **Calls that need types** (`a.b()`, `this.x.y()`, `context.svc.m()`): **47%** in the fixture, **57%** in Hive and **41%** in Twenty. Without a type checker, about half of the links are missing.

## 2. Type pass (TS 6 API: one program, every call resolved)

| Repo | Project files → program files | Total time | Peak RSS | Resolved (identifier / member) |
|---|---|---|---|---|
| fixture (with deps) | 79 → 624 | **1.8 s** | 407 MB | **100% / 100%** |
| Hive (no deps) | 2,092 → 2,184 | 8.0 s | 1.0 GB | 62% / 41% |
| Hive (**with deps**) | 2,092 → **13,468** | **37.5 s** (program 13.2 + checker 3.3 + calls 21.0) | **3.3 GB** | **96.5% / 95.1%** |
| Twenty `twenty-server` (no deps) | 12,136 → 12,304 | 23.9 s | 2.1 GB | 47% / 45% |

- **Precision**: in the fixture, every critical link of `EXPECTED.md` shows up, such as `promotion.resolvers.ts:30 context.catalog.getTitle → CatalogService.getTitle` (through the lazy context typed by codegen) or `query.resolvers.ts:15-16 createRestClient / catalogApi.get`. In Hive, dependency-injected calls such as `this.storage.getOrganization` resolve to `Storage.getOrganization`.
- **Without dependencies installed, precision drops to ~40–60%**, because external types become `any` and the chains break.
- **The cost comes from the dependencies' `.d.ts` files** (2k project files pull in 11k declarations), not from the project's code.
- Twenty with dependencies was not measured (heavy install). Extrapolating from Hive, a single program with `twenty-server` and its dependencies probably does not fit in 4 GB.

## 3. Incremental update (TS 6, `oldProgram`, one file edited)

| Repo | First time: program + calls of the file | After the edit: program + calls of the file |
|---|---|---|
| fixture | 946 ms + 258 ms | **11 ms + 11 ms** |
| Hive (with deps) | 10.1 s + 3.2 s | **190 ms + 259 ms** |

The program structure is fully reused. **Watch mode is feasible.**

## 4. TS 6 vs TS 7 (full `tsc --noEmit`)

| Repo | TS 6 | TS 7 | Gain |
|---|---|---|---|
| fixture | 2.66 s / 350 MB | 0.39 s / 127 MB | ~7× |
| Twenty `twenty-server` (no deps) | 8.3 s / 1.5 GB | 1.9 s / 1.2 GB | ~4× |
| Hive (with deps, migrated tsconfig) | 23.7 s / 2.1 GB | 5.5 s / 2.3 GB | ~4.3× |

- **TS 7 rejects old tsconfigs** (`baseUrl` and `moduleResolution: node10` were removed) and stops without type-checking. On Hive the tsconfig had to be migrated. The tool will have to adapt the options in memory.
- There is no programmatic API yet (expected in 7.1). Today it only works as a CLI.

## Conclusions for the architecture

1. **Node/TS stack confirmed.** The heavy engines are native (oxc) or unavoidable (the TS type checker). Rewriting in Rust or Go would not remove the dominant cost, which is the checker over the dependencies.
2. **Layered analysis**:
   - **instant**: the project graph (Nx or workspace);
   - **seconds**: the module graph with oxc (imports/exports), cached by file hash;
   - **in the background**: type-based links with TS, cached and updated incrementally. The area the user opens has priority.
3. **The checker sits behind an interface**: TS 6 today, and TS 7 once the 7.1 API is out (4–7× faster).
4. **Memory is the main risk.** Mitigations:
   - one program per project/tsconfig, not one for the whole repo;
   - only resolve member calls (calls to imported functions are already resolved by the import graph);
   - don't keep several programs alive in parallel;
   - configurable heap limit and bounded workers (~4).
5. **Require (or detect) installed dependencies** for the type layer. Without them, warn and show the precision as "partial".
6. **Missing generated files** (codegen not run): detect, warn and optionally offer to run the codegen.
7. Bonus: the spike found a real, unplanted problem in the fixture (undeclared dependencies that only resolve through `paths`). Comparing imports with `package.json` is a cheap and useful analysis.

## Spike limitations

- It measures time and memory, not the quality of the final map. Precision was checked by hand against `EXPECTED.md` (fixture) and by sampling (Hive).
- Twenty with dependencies and the time of `nx graph` were not measured.
- It resolves every call; the app only needs a subset, so these times are an upper bound.

## How to reproduce

```bash
cd spikes/indexing && pnpm install
git clone --depth 1 https://github.com/graphql-hive/console.git .repos/hive
git clone --depth 1 https://github.com/twentyhq/twenty.git .repos/twenty
# (optional) cd .repos/hive && pnpm install --frozen-lockfile --ignore-scripts --config.engine-strict=false

node src/fast-pass.ts .repos/twenty --workers 4 --no-calls          # fast pass
node src/fast-pass.ts .repos/twenty --workers 1 --no-calls --raw
node --max-old-space-size=3500 src/typed-pass.ts .repos/hive --edges <path>   # type pass
node --max-old-space-size=3500 src/incremental.ts .repos/hive <relative-file>
```

Results go to `results/` (ignored by git).

Other scripts in `src/` (used by the visualization and design spikes): `export-graph.ts` (file-level import graph), `export-usage.ts` (symbol usage, production vs tests) and `export-flow.ts` (request-flow links: resolver fields, operations, DataLoaders, exits).
