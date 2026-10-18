# Adding a GraphQL module

1. Create `packages/gql-module-<name>` with `<name>.graphql`, `typedefs.ts`, `resolvers/`, `context.ts` and `register-cms-mappers.ts`.
2. Add an output for it in `codegen.ts` and run `pnpm gen:types`.
3. Register the module in `apps/bff/src/schema.ts` and `apps/bff/src/context.ts`.
