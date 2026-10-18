# Data model

The graph is the contract between the analysis layers, the analyses and the dashboard. It is language-independent: a Java adapter produces the same node and edge kinds as the TypeScript one.

## Nodes

| Kind | Example | Produced by |
|---|---|---|
| `workspace` | the analysed root | layer 0 |
| `project` | `@streaming/gql-module-catalog` (app or package) | layer 0 |
| `directory` | `packages/catalog-service/src/mappers` | layer 1 |
| `file` | `.../title-mapper.ts` (with `test`, `generated`, `declaration` flags) | layer 1 |
| `symbol` | function, class, method, variable, type, interface, enum | layer 1 (declarations) and layer 2 (members) |
| `external-package` | `dataloader`, `graphql` | layer 1 |
| `gql-type` | `Title` | layer 3 |
| `gql-field` | `Title.availability` | layer 3 |
| `gql-operation` | `HomeView` (persisted query or client document) | layer 3 |
| `subgraph` | `catalog` | layer 3 |
| `endpoint` | `catalog-api GET /titles`, `people-api query PeopleByIds` | layer 3 |
| `registry-key` | `cms:title_rail` (key of a string-keyed registry) | layer 3, from configuration |

## Edges

| Kind | From → to | Example |
|---|---|---|
| `contains` | workspace → project → directory → file → symbol | |
| `depends-on` | project → project | declared (`package.json`) or inferred from imports; the `declared` attribute tells them apart |
| `imports` | file → file / external-package | with the imported names |
| `exports` | file → symbol | includes re-exports |
| `references` | symbol → symbol | use of a type, read of a variable |
| `calls` | symbol → symbol | `loadTitle` → `CatalogService.getTitle` |
| `implements` / `extends` | symbol → symbol | |
| `defines` | project/file → gql-type / gql-field | the module that owns the type |
| `resolves` | symbol → gql-field | the resolver of `Title.name` |
| `returns` | gql-field → gql-type | `Card.target` → `Node` |
| `selects` | gql-operation → gql-field | fields an operation uses |
| `contributes` | subgraph → gql-field | Federation |
| `requests` | symbol → endpoint | the retriever that does `GET /titles` |
| `registers` | symbol → registry-key → symbol | who registers, and which handler |

## Provenance and confidence

Every edge has:

| Attribute | Values | Why |
|---|---|---|
| `via` | `declared`, `syntax`, `types`, `heuristic`, `config` | To tell the user where the link comes from |
| `confidence` | `certain`, `likely`, `possible` | To filter, and to show uncertain links differently |
| `location` | file, line, column | To jump to the code |
| `layer` | 0–3 | To know what to invalidate when a file changes |

Examples: a resolved `import` is `syntax/certain`; `context.catalog.getTitle()` resolved by the checker is `types/certain`; mapping the path of a `GET` to an endpoint is `heuristic/likely`.

## Identifiers

They are stable across runs, so the cache works and dashboard links can be shared:

```
project:<name>
file:<path relative to the root>
sym:<file path>#<symbol path>       e.g. sym:packages/catalog-service/src/catalog-service.ts#CatalogService.getTitle
gql:<schema>:<Type>[.<field>]       e.g. gql:bff:Title.availability
op:<schema>:<operation name>
endpoint:<client>:<method> <path>   e.g. endpoint:catalog-api:GET /titles
```

The symbol path format is inspired by [SCIP](https://github.com/sourcegraph/scip), to keep open the option of importing SCIP indexes for other languages.

## Persistence

SQLite in the analysed project's cache folder:

- `nodes(id, kind, name, project, file, data_json)`
- `edges(from_id, to_id, kind, via, confidence, file, line, layer)`
- `files(path, hash, size, layers_done, generated, test)`
- `findings(id, rule, severity, node_id, message, data_json)`
- `meta(key, value)`: schema version, tool version and layer status

Export: JSON with the same nodes and edges, for use in other tools or a static page.
