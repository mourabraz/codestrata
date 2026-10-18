# 0012. Name: codestrata

- Status: Accepted
- Date: 2026-10-18

## Context

The project needed a short name, easy to pronounce in English ([0011](0011-english-as-project-language.md)) and free on npm. More than 40 candidates were checked. The obvious ones (`codemap`, `repomap`, `codeatlas`, `cartograph`…) were taken, and others would have been refused by npm because a hyphenated variant was already registered. The free finalists were `codestrata`, `graphsight`, `codeglass` and `traceway`.

## Decision

- Name of the project, the npm package and the command: **`codestrata`** (*strata* = layers, like the analysis layers and the zoom levels of the map).
- Command: `codestrata analyze <path>`. A short alias can be added later, after checking it does not clash with common commands.
- Configuration file in the analysed project: `codestrata.config.json`.
- Cache folder: `~/.cache/codestrata/`.
- Internal monorepo packages: `@codestrata/<name>` (e.g. `@codestrata/core`).

## Consequences

- Reserved on 2026-10-18: the `codestrata` package on npm (placeholder `0.0.0-stage`), the `codestrata` organisation on npm (scope `@codestrata`) and the repository `github.com/mourabraz/codestrata`.
- Trademarks and domains were not checked.
