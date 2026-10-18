# 0010. MIT licence

- Status: Accepted
- Date: 2026-10-18

## Context

The project is open source ([0001](0001-open-source-local-first.md)) and meant to be adopted by any person or company, including on private code. The options considered were MIT (simple and very common for developer tools) and Apache-2.0 (with an explicit patent grant, but longer).

## Decision

The project uses the **MIT** licence (`LICENSE` file at the root).

## Consequences

- Frictionless adoption: legal teams know and accept MIT.
- Dependencies bundled in the published package must have compatible licences (MIT, ISC, BSD, Apache-2.0). They should be checked in CI before publishing.
