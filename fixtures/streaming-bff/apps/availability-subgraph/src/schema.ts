import type { GraphQLResolverMap, GraphQLSchemaModule } from '@apollo/subgraph';
import { mergeResolvers } from '@graphql-tools/merge';
import { federationLinkTypedefs, scalarResolvers, scalarTypedefs, toSdl } from '@streaming/gql-common';
import * as availability from '@streaming/gql-module-availability';
import { parse } from 'graphql';

export const SUBGRAPH_NAME = 'availability';

export function availabilitySubgraphSdl(): string {
  return toSdl([...federationLinkTypedefs, ...scalarTypedefs, ...availability.typedefs]);
}

export function availabilitySubgraphModule(): GraphQLSchemaModule {
  return {
    typeDefs: parse(availabilitySubgraphSdl()),
    // graphql-tools and @apollo/subgraph type resolver maps differently; the runtime shape is the same.
    resolvers: mergeResolvers([scalarResolvers, availability.resolvers]) as GraphQLResolverMap<unknown>,
  };
}
