import type { GQLResolvers } from '../gqltypes.generated';
import { promotionResolvers } from './promotion.resolvers';
import { queryResolvers } from './query.resolvers';

export const resolvers: GQLResolvers = {
  Query: queryResolvers,
  Promotion: promotionResolvers,
};
