import { createServer } from 'node:http';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { configSelectorFromEnv, loadConfig } from '@streaming/bff-config';
import {
  createLazyContext,
  getCommonContextBuilders,
  requestInfoFromHeaders,
} from '@streaming/core-services';
import { type CatalogModuleContext, getContextExtensionBuilder } from '@streaming/gql-module-catalog';
import { createGraphQLClient, createRestClient } from '@streaming/http-client';
import { createYoga } from 'graphql-yoga';
import { catalogSubgraphModule } from './schema';

const PORT = 4101;

const { endpoints } = loadConfig(configSelectorFromEnv());
const clients = {
  catalogApi: createRestClient({ name: 'catalog-api', baseUrl: endpoints.catalogApi }),
  peopleApi: createGraphQLClient({ name: 'people-api', endpoint: endpoints.peopleApi }),
  cmsApi: createRestClient({ name: 'cms-api', baseUrl: endpoints.cmsApi }),
};
const buildCatalogExtension = getContextExtensionBuilder(clients);

const yoga = createYoga<Record<string, unknown>, CatalogModuleContext>({
  schema: buildSubgraphSchema([catalogSubgraphModule()]),
  context: ({ request }) => {
    const requestInfo = requestInfoFromHeaders(request.headers);
    return createLazyContext<CatalogModuleContext>({
      ...getCommonContextBuilders(clients, requestInfo),
      ...buildCatalogExtension(requestInfo),
    });
  },
});

createServer(yoga).listen(PORT, () => {
  console.info(`catalog subgraph listening on http://localhost:${PORT}${yoga.graphqlEndpoint}`);
});
