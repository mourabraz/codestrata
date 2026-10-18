import type { GraphQLResolverMap, GraphQLSchemaModule } from '@apollo/subgraph';
import { mergeResolvers } from '@graphql-tools/merge';
import {
  federationLinkTypedefs,
  nodeResolvers,
  nodeTypedefs,
  scalarResolvers,
  scalarTypedefs,
  toSdl,
} from '@streaming/gql-common';
import * as catalog from '@streaming/gql-module-catalog';
import { parse } from 'graphql';

export const SUBGRAPH_NAME = 'catalog';

export function catalogSubgraphSdl(): string {
  return toSdl([...federationLinkTypedefs, ...scalarTypedefs, ...nodeTypedefs, ...catalog.typedefs]);
}

export function catalogSubgraphModule(): GraphQLSchemaModule {
  return {
    typeDefs: parse(catalogSubgraphSdl()),
    // graphql-tools and @apollo/subgraph type resolver maps differently; the runtime shape is the same.
    resolvers: mergeResolvers([
      scalarResolvers,
      nodeResolvers,
      catalog.resolvers,
    ]) as GraphQLResolverMap<unknown>,
  };
}
