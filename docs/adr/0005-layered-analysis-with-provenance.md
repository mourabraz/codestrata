# 0005. Layered, incremental analysis with provenance on every link

- Status: Accepted
- Date: 2026-10-18

## Context

There is a trade-off between speed and precision: the structure (imports) is available within seconds, while type-based links cost tens of seconds and a lot of memory the first time ([spike](../../spikes/indexing/REPORT.md)). About half of the calls (41–57% in the repos measured) can only be resolved with types.

## Decision

- The analysis runs in **layers** (workspace → structure → types → frameworks → analyses). Each one writes to the graph when it finishes, and the dashboard updates.
- The type layer is **prioritised by interest**: first what the user is looking at.
- Everything is **cached by file hash**. Later runs and watch mode only reprocess what changed.
- Every edge records its **provenance** (`declared`, `syntax`, `types`, `heuristic`, `config`) and its **confidence**.

## Consequences

- The user sees the map within seconds, even on large repos.
- The dashboard has to cope with a graph that keeps changing and show the status of each layer.
- Cache invalidation has to know the dependencies between files and layers.
- The user can tell a certain link from a likely one.
