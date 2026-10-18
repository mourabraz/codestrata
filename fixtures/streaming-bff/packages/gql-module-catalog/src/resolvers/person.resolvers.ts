import { toPointer } from '@streaming/urn-codecs';
import type { GQLPersonResolvers } from '../gqltypes.generated';
import { loadPerson } from '../load-entities';

export const personResolvers: GQLPersonResolvers = {
  __resolveReference: (reference) => ({ urn: reference.urn }),
  urn: (parent) => parent.urn,
  name: async (parent, _args, context) => (await loadPerson(context, parent.urn)).name,
  birthYear: async (parent, _args, context) => (await loadPerson(context, parent.urn)).birthYear,
  knownFor: async (parent, _args, context) =>
    (await loadPerson(context, parent.urn)).knownForTitleIds.map((id) => toPointer('title', id)),
};
