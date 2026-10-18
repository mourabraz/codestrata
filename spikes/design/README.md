# Design exploration: prototype of the views

A throwaway prototype of the five dashboard views (and of the request flow, inside the Usage view), on real data (the fixture and `graphql-hive/console`): **Layers**, **Usage** (+ Request flow as grouped flow, path and sequence), **Trace**, **Matrix** and **Areas**. It was used to settle the design before choosing the technology ([ADR 0013](../../docs/adr/0013-dashboard-design.md), [ADR 0014](../../docs/adr/0014-dashboard-technology.md)). It is not app code; it is the visual reference for phase 1.

- Published page (private): https://claude.ai/artifact/78XWkDN4Kfy1s844sBEBnd
- Local file: `prototype.html` (opens directly in a browser).

## Rebuild

```bash
# 1. source data (needs the clones in spikes/indexing/.repos, and Hive with its dependencies installed)
cd spikes/indexing
node src/export-graph.ts ../../fixtures/streaming-bff ../visualization/data/fixture.raw.json
node src/export-graph.ts .repos/hive ../visualization/data/hive.raw.json
node src/export-usage.ts ../../fixtures/streaming-bff ../design/data/fixture.usage.json
node --max-old-space-size=3800 src/export-usage.ts .repos/hive ../design/data/hive.usage.json   # ~80 s, ~3.3 GB
node src/export-flow.ts ../../fixtures/streaming-bff ../design/data/fixture.flow.json   # entries, resolvers, DataLoaders and exits (request flow)

# 2. compact data + page
cd ../design
node scripts/build-data.mjs     # data/prototype-data.json
node scripts/build-html.mjs     # prototype.html
```

The GraphQL trace (`data/fixture.trace.json`) was written by hand from `fixtures/streaming-bff/EXPECTED.md`. In the real app it is derived by the GraphQL layer (phase 3). The request flow, on the other hand, is extracted automatically by `export-flow.ts`, a first rehearsal of that layer.
