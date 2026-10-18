import { toPointer } from '@streaming/urn-codecs';
import type { GQLQueryResolvers } from '../gqltypes.generated';

export const queryResolvers: GQLQueryResolvers = {
  promotions: async (_parent, { region }, context) =>
    (await context.promotions.listActive(region ?? context.request.region)).map((promotion) =>
      toPointer('promotion', promotion.id),
    ),

  promotion: async (_parent, { urn }, context) =>
    (await context.promotions.getPromotion(urn)) ? { urn } : null,
};
