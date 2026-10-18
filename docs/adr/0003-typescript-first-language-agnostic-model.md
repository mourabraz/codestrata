# 0003. TypeScript first, language-agnostic graph model

- Status: Accepted
- Date: 2026-10-18

## Context

The initial use case is a TypeScript monorepo. Java and other languages should be supported in the future.

## Decision

- The MVP supports TypeScript/JavaScript.
- The graph model ([data model](../data-model.md)) does not depend on the language. Each language comes in as a `LanguageAdapter` that produces the same node and edge kinds.
- Symbol identifiers follow a format inspired by SCIP, so indexes for other languages can be imported.

## Consequences

- A Java adapter can run in a separate process (for example on the JVM) and write to the same graph.
- The analyses and the dashboard work unchanged for new languages, except where there are language-specific concepts.
