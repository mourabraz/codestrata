import { formatTitleName } from '@streaming/gql-module-catalog';
import type { Promotion } from '@streaming/promotions-service';
import { encodeUrn, toPointer } from '@streaming/urn-codecs';
import { GraphQLError } from 'graphql';
import type { PromotionsModuleContext } from '../context';
import type { GQLPromotionResolvers } from '../gqltypes.generated';

async function loadPromotion(context: PromotionsModuleContext, urn: string): Promise<Promotion> {
  const promotion = await context.promotions.getPromotion(urn);
  if (!promotion)
    throw new GraphQLError(`Promotion not found: ${urn}`, { extensions: { code: 'NOT_FOUND' } });
  return promotion;
}

export const promotionResolvers: GQLPromotionResolvers = {
  __resolveReference: (reference) => ({ urn: reference.urn }),
  urn: (parent) => parent.urn,
  headline: async (parent, _args, context) => (await loadPromotion(context, parent.urn)).headline,
  description: async (parent, _args, context) => (await loadPromotion(context, parent.urn)).description,
  validUntil: async (parent, _args, context) => (await loadPromotion(context, parent.urn)).validUntil,

  title: async (parent, _args, context) => {
    const { titleId } = await loadPromotion(context, parent.urn);
    return titleId ? toPointer('title', titleId) : null;
  },

  titleName: async (parent, _args, context) => {
    const { titleId } = await loadPromotion(context, parent.urn);
    if (!titleId) return null;
    const title = await context.catalog.getTitle(encodeUrn('title', titleId));
    return title ? formatTitleName(title) : null;
  },

  displayCard: async (parent, _args, context) => {
    const promotion = await loadPromotion(context, parent.urn);
    return { kind: 'card', label: promotion.headline, target: { urn: parent.urn } };
  },
};
