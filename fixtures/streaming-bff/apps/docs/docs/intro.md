# Streaming BFF

GraphQL backend-for-frontend for the streaming web and app clients.

- Each domain lives in a `gql-module-*` package (schema, resolvers, context extension, CMS mappers).
- `apps/bff` merges every module into one schema. `apps/*-subgraph` run single modules as federated subgraphs.
- Resolvers return `{ urn }` pointers; the type that owns the entity loads its data.
