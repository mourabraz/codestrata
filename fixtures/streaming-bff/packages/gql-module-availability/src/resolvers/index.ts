import type { GQLResolvers } from '../gqltypes.generated';

export const resolvers: GQLResolvers = {
  Title: {
    __resolveReference: (reference) => ({ urn: reference.urn }),
    availability: (parent, { region }, context) =>
      context.availability.getForTitle(parent.urn, region ?? context.request.region),
  },
};
