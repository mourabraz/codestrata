import { toPointer } from '@streaming/urn-codecs';
import type { GQLTitleResolvers } from '../gqltypes.generated';
import { loadTitle } from '../load-entities';

export const titleResolvers: GQLTitleResolvers = {
  __resolveReference: (reference) => ({ urn: reference.urn }),
  urn: (parent) => parent.urn,
  name: async (parent, _args, context) => (await loadTitle(context, parent.urn)).name,
  synopsis: async (parent, _args, context) => (await loadTitle(context, parent.urn)).synopsis,
  year: async (parent, _args, context) => (await loadTitle(context, parent.urn)).year,
  genres: async (parent, _args, context) => (await loadTitle(context, parent.urn)).genres,
  cast: async (parent, _args, context) =>
    (await loadTitle(context, parent.urn)).cast.map((member) => toPointer('person', member.personId)),
  similar: async (parent, _args, context) =>
    (await loadTitle(context, parent.urn)).similarIds.map((id) => toPointer('title', id)),
};
