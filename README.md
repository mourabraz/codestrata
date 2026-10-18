# codestrata

> In its feasibility phase: there is no application to install yet.

An open source, local tool to understand software projects. It analyses a project that is already on disk, with its dependencies installed, without leaving the machine, and opens a web dashboard with a navigable map of the code: the monorepo's projects, files, functions and who uses what. It has framework-specific layers, starting with GraphQL (schema → resolver → service → external API).

- [Vision](docs/vision.md): why, and for whom
- [Features](docs/features.md)
- [Architecture](docs/architecture.md) and [decisions](docs/adr/README.md)
- [Plan](docs/plan.md)

## Status

| | |
|---|---|
| Test fixture | [`fixtures/streaming-bff`](fixtures/streaming-bff/README.md), with its [ground truth](fixtures/streaming-bff/EXPECTED.md) |
| Indexing spike | [`spikes/indexing/REPORT.md`](spikes/indexing/REPORT.md) |
| Visualization spike | [`spikes/visualization/REPORT.md`](spikes/visualization/REPORT.md) |
| Design prototype | [`spikes/design/`](spikes/design/README.md) (the dashboard's visual reference) |
| Application | Phase 0 done; phase 1 has not started yet (see the [plan](docs/plan.md)) |

## Licence

[MIT](LICENSE)
