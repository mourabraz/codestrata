import type { GQLResolvers } from '../gqltypes.generated';

export const resolvers: GQLResolvers = {
  Query: {
    view: (_parent, { urn }, context) => context.contentDefinition.getView(urn),
  },
  Section: {
    __resolveType: (section) => (section.kind === 'card_group' ? 'CardGroup' : 'Swimlane'),
  },
  CardGroup: {
    cards: (group) => group.children,
  },
  Card: {
    target: (card) => card.target,
  },
};
