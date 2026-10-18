# 0007. A fictional fixture with the ground truth as the acceptance test

- Status: Accepted
- Date: 2026-10-18

## Context

The real project that motivated the tool cannot be used during development ([0001](0001-open-source-local-first.md)). Open source repos are good for measuring scale, but they don't say what the correct result is.

## Decision

- `fixtures/streaming-bff` is a fictional monorepo (pnpm + Nx, schema-first GraphQL, Federation) that reproduces the patterns of the use case without real code or names.
- `EXPECTED.md` describes what the analyser must find, including planted problems with file and line. It is the acceptance test for the phases of the [plan](../plan.md).
- The fixture is a working project: it compiles, has tests and runs end to end against mocked backends.
- Open source repos (Hive, Twenty) are used to measure performance and as precision regression tests by sampling.

## Consequences

- Any change to the fixture must update `EXPECTED.md`.
- New patterns found in real projects go into the fixture first, in a generic form.
