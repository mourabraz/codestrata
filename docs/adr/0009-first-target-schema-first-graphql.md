# 0009. First target: schema-first GraphQL with @graphql-tools, codegen and Federation, in an Nx/pnpm monorepo

- Status: Accepted
- Date: 2026-10-18

## Context

There are many GraphQL styles (schema-first, code-first, NestJS, Pothos, graphql-modules, Apollo `dataSources`) and many monorepo setups. The initial use case uses:

- domain modules with `.graphql` files loaded with `@graphql-tools/load-files`;
- a merge into a monolith with `mergeTypeDefs`/`mergeResolvers`;
- resolvers typed by GraphQL Code Generator;
- a per-request context with services;
- Federation (some modules are already subgraphs);
- a pnpm + Nx monorepo.

## Decision

The first `FrameworkAdapter` supports schema-first GraphQL with `@graphql-tools`, codegen and Federation. The first `WorkspaceAdapter` supports Nx and pnpm workspaces. Project-specific patterns (string-keyed registries, module contract names) come in through configuration.

## Consequences

- The field ↔ resolver link uses the codegen-generated types first (`GQL*Resolvers`), which are reliable, and only then heuristics on the shape of resolver maps.
- Other GraphQL styles and monorepo setups come later, driven by demand.
