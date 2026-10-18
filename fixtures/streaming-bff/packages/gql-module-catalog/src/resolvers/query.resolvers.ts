import { configSelectorFromEnv, loadConfig } from '@streaming/bff-config';
import { createRestClient } from '@streaming/http-client';
import { toPointer } from '@streaming/urn-codecs';
import type { GQLQueryResolvers } from '../gqltypes.generated';

export const queryResolvers: GQLQueryResolvers = {
  title: async (_parent, { urn }, context) => ((await context.catalog.getTitle(urn)) ? { urn } : null),

  search: async (_parent, { text, limit }, context) =>
    (await context.catalog.search(text, limit)).map((title) => toPointer('title', title.id)),

  // TODO: move into CatalogService. Quick fix for the trending rail; it skips the service layer.
  trending: async (_parent, _args, context) => {
    const config = loadConfig(configSelectorFromEnv());
    const catalogApi = createRestClient({ name: 'catalog-api', baseUrl: config.endpoints.catalogApi });
    const response = await catalogApi.get<{ ids: string[] }>('/titles/trending', {
      region: context.request.region,
    });
    return response.ids.map((id) => toPointer('title', id));
  },

  legacyTitles: (_parent, { ids }) => ids.map((id) => toPointer('title', id)),
};
