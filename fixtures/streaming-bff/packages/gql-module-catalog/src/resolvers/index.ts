import type { GQLResolvers } from '../gqltypes.generated';
import { personResolvers } from './person.resolvers';
import { queryResolvers } from './query.resolvers';
import { titleResolvers } from './title.resolvers';

export const resolvers: GQLResolvers = {
  Query: queryResolvers,
  Title: titleResolvers,
  Person: personResolvers,
};
