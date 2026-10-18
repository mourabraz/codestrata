# 0006. LLM features are optional, isolated and off by default

- Status: Accepted
- Date: 2026-10-18

## Context

Module summaries and natural-language questions can be useful, but sending code to an external service is unacceptable in many contexts ([0001](0001-open-source-local-first.md)).

## Decision

- No core feature depends on an LLM.
- LLM features live in a separate package, off by default, and only run when explicitly enabled.
- Before sending anything, the tool shows what it will send. Local models should be supported.

## Consequences

- The core and the dashboard work without a network.
- The LLM package can evolve at its own pace without affecting the rest.
