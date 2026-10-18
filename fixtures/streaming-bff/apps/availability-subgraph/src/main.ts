import { createServer } from 'node:http';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { configSelectorFromEnv, loadConfig } from '@streaming/bff-config';
import {
  createLazyContext,
  getCommonContextBuilders,
  requestInfoFromHeaders,
} from '@streaming/core-services';
import {
  type AvailabilityModuleContext,
  getContextExtensionBuilder,
} from '@streaming/gql-module-availability';
import { createRestClient } from '@streaming/http-client';
import { createYoga } from 'graphql-yoga';
import { availabilitySubgraphModule } from './schema';

const PORT = 4102;

const { endpoints } = loadConfig(configSelectorFromEnv());
const clients = {
  availabilityApi: createRestClient({
    name: 'availability-api',
    baseUrl: endpoints.availabilityApi,
    timeoutMs: 800,
  }),
  cmsApi: createRestClient({ name: 'cms-api', baseUrl: endpoints.cmsApi }),
};
const buildAvailabilityExtension = getContextExtensionBuilder(clients);

const yoga = createYoga<Record<string, unknown>, AvailabilityModuleContext>({
  schema: buildSubgraphSchema([availabilitySubgraphModule()]),
  context: ({ request }) => {
    const requestInfo = requestInfoFromHeaders(request.headers);
    return createLazyContext<AvailabilityModuleContext>({
      ...getCommonContextBuilders(clients, requestInfo),
      ...buildAvailabilityExtension(requestInfo),
    });
  },
});

createServer(yoga).listen(PORT, () => {
  console.info(`availability subgraph listening on http://localhost:${PORT}${yoga.graphqlEndpoint}`);
});
