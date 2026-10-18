import { mergeResolvers, mergeTypeDefs } from '@graphql-tools/merge';
import { makeExecutableSchema } from '@graphql-tools/schema';
import {
  federationDirectiveTypedefs,
  nodeResolvers,
  nodeTypedefs,
  scalarResolvers,
  scalarTypedefs,
} from '@streaming/gql-common';
import * as availability from '@streaming/gql-module-availability';
import * as catalog from '@streaming/gql-module-catalog';
import * as layout from '@streaming/gql-module-layout';
import * as promotions from '@streaming/gql-module-promotions';

export const modules = [catalog, availability, promotions, layout];

/** The monolith: every module merged into a single schema. */
export function buildBffSchema() {
  return makeExecutableSchema({
    typeDefs: mergeTypeDefs([
      ...federationDirectiveTypedefs,
      ...scalarTypedefs,
      ...nodeTypedefs,
      ...modules.flatMap((module) => module.typedefs),
    ]),
    resolvers: mergeResolvers([scalarResolvers, nodeResolvers, ...modules.map((module) => module.resolvers)]),
  });
}

export function registerAllCmsDocMappers(): void {
  for (const module of modules) {
    module.registerCmsDocMappers();
  }
}
