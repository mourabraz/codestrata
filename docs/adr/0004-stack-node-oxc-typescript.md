# 0004. Stack: Node/TS, oxc and the TS type checker behind an interface

- Status: Accepted
- Date: 2026-10-18

## Context

The analysis has to be fast; a slow analysis is not useful. Three options were considered: everything in Node/TS with native engines, a Rust core, or a Go core reusing the TS 7 compiler.

The spike ([`spikes/indexing/REPORT.md`](../../spikes/indexing/REPORT.md)) measured:

- **oxc** (parser and resolver in Rust, with Node bindings): Twenty (33k files) in ~3 s with 4 workers; internal imports resolved almost 100%.
- **The dominant cost is the TypeScript type checker** over the dependencies' `.d.ts` files: Hive with deps, 37 s and 3.3 GB the first time. That cost does not go away in another language, because the only complete TS type checker is TypeScript's own.
- **Precision with the checker**: 95–100% of calls resolved when dependencies are installed.
- **Incremental**: ~0.5 s per edit.
- **TS 7** (native, in Go): 4–7× faster on the CLI, but no programmatic API until 7.1, and its internal packages are not a stable API to use from Go.

## Decision

- The tool is written in **Node + TypeScript**.
- **oxc-parser** and **oxc-resolver** for the structural layer.
- **The TypeScript 6 API** for the type layer, behind a `TypeResolver` interface, to switch to **TS 7** once the 7.1 API is available.
- **graphql-js** and the JS ecosystem (including Federation composition) for the GraphQL layer.

## Consequences

- The GraphQL and monorepo ecosystems are JavaScript, and so is the target audience. That makes contributing and distributing through npm easier.
- Performance depends on avoiding work in JS where it is expensive (walking ASTs) and on child processes with memory limits.
- We will have to follow the TS 7 API and normalise old tsconfigs (`baseUrl`, `node10`), which TS 7 rejects.
- If TS 7 ever gets an in-process API, this decision may be worth revisiting.
