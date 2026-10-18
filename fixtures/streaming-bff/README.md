# streaming-bff (fixture)

A fictional example monorepo used to develop and test codestrata. It reproduces the architecture of a real GraphQL BFF without code or names from any existing project:

- a **pnpm + Nx** monorepo, TypeScript;
- **GraphQL modules per domain** (`packages/gql-module-*`), all with the same contract: `typedefs`, `resolvers`, `getContextExtensionBuilder` and `registerCmsDocMappers`;
- **schema-first** (one `.graphql` per module) with **GraphQL Code Generator** (resolver types prefixed with `GQL`, a typed context per module, entities passed as `{ urn }` pointers);
- a **monolith** (`apps/bff`, Yoga/Envelop) that merges every module, and **Federation subgraphs** (`apps/catalog-subgraph`, `apps/availability-subgraph`) composed into a supergraph for the Apollo Router (`apps/router`);
- a **lazy per-request context**, services with **DataLoader** and an **LRU** cache, retrievers over REST clients and an external **GraphQL** client;
- **CMS → layout → data**: views defined in the CMS, mappers registered by document type, sections that return pointers to domain entities;
- **persisted queries** and introspection blocking;
- non-TS apps: a **Rust** gateway and **docs**.

What the analyser must find, including the problems planted on purpose, is in [EXPECTED.md](EXPECTED.md).

## Commands

```bash
pnpm install
pnpm gen            # codegen + apps/bff/schema.graphql (validates the persisted queries) + supergraph
pnpm typecheck
pnpm test           # node --test
pnpm exec biome check .
pnpm nx graph       # Nx project graph
```

Run it end to end, against mocked backends:

```bash
pnpm start:mocks    # terminal 1: fake APIs (catalog, people, promotions, availability, CMS)
pnpm start:bff      # terminal 2: http://localhost:4000/api
pnpm smoke          # terminal 3: sends each persisted query by hash and prints the responses
```

On WSL, port 5004 refuses IPv4 connections, so the availability mock uses port 5006.

## Layout

```
apps/
  bff/                    monolith: merges the modules, context, persisted queries
  catalog-subgraph/       the catalog module as a subgraph
  availability-subgraph/  the availability module as a subgraph
  router/                 Apollo Router config and the generated supergraph
  router-gateway/         Rust gateway (not TS)
  docs/                   documentation (not TS)
  mock-backends/          fake external APIs for local testing
packages/
  gql-module-{catalog,availability,promotions,layout}/
  {catalog,people,promotions,availability}-service/
  core-services/          common context, lazy context, CMS and mapper registry
  gql-common/             URN scalar, Node interface, Federation directives
  layout-types/  urn-codecs/  http-client/  bff-config/  envelop-plugins/  test-utils/
```
