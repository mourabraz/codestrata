import { join } from 'node:path';
import { loadFilesSync } from '@graphql-tools/load-files';
import { decodeUrn, type UrnEntityType, type UrnPointer } from '@streaming/urn-codecs';
import { type DocumentNode, GraphQLScalarType, Kind, print } from 'graphql';

export type { UrnPointer } from '@streaming/urn-codecs';

const FEDERATION_DIR = join(import.meta.dirname, '..', 'federation');

export const scalarTypedefs = loadFilesSync(join(import.meta.dirname, 'scalars.graphql'));
export const nodeTypedefs = loadFilesSync(join(import.meta.dirname, 'node.graphql'));

/** Federation directive definitions, needed only when the monolith builds a plain executable schema. */
export const federationDirectiveTypedefs = loadFilesSync(join(FEDERATION_DIR, 'directives.graphql'));

/** The `extend schema @link(...)` header that turns a module schema into a Federation 2 subgraph. */
export const federationLinkTypedefs = loadFilesSync(join(FEDERATION_DIR, 'link.graphql'));

export function toSdl(typedefs: ReadonlyArray<string | DocumentNode>): string {
  return typedefs.map((def) => (typeof def === 'string' ? def : print(def))).join('\n');
}

function assertUrn(value: unknown): string {
  if (typeof value !== 'string') {
    throw new TypeError(`URN must be a string, got ${typeof value}`);
  }
  decodeUrn(value);
  return value;
}

export const URNScalar = new GraphQLScalarType<string, string>({
  name: 'URN',
  serialize: assertUrn,
  parseValue: assertUrn,
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING) {
      throw new TypeError('URN literal must be a string');
    }
    return assertUrn(ast.value);
  },
});

const GRAPHQL_TYPE_BY_URN_TYPE: Record<UrnEntityType, string> = {
  title: 'Title',
  person: 'Person',
  promotion: 'Promotion',
  view: 'View',
};

export function graphQLTypeForUrn(urn: string): string {
  return GRAPHQL_TYPE_BY_URN_TYPE[decodeUrn(urn).type];
}

export const scalarResolvers = {
  URN: URNScalar,
};

export const nodeResolvers = {
  Node: {
    __resolveType: (parent: UrnPointer) => graphQLTypeForUrn(parent.urn),
  },
};
