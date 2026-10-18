import { createServer } from 'node:http';
import { join } from 'node:path';
import { usePersistedOperations } from '@graphql-yoga/plugin-persisted-operations';
import { configSelectorFromEnv, loadConfig } from '@streaming/bff-config';
import { requestInfoFromHeaders } from '@streaming/core-services';
import { loadPersistedOperations, useBlockIntrospection } from '@streaming/envelop-plugins';
import { createYoga } from 'graphql-yoga';
import { createClients } from './clients';
import { type BffContext, createContextFactory } from './context';
import { buildBffSchema, registerAllCmsDocMappers } from './schema';

const config = loadConfig(configSelectorFromEnv());
const createContext = createContextFactory(createClients(config));
const persistedOperations = loadPersistedOperations(join(import.meta.dirname, '..', 'persisted-operations'));

registerAllCmsDocMappers();

const yoga = createYoga<Record<string, unknown>, BffContext>({
  schema: buildBffSchema(),
  graphqlEndpoint: '/api',
  context: ({ request }) => createContext(requestInfoFromHeaders(request.headers)),
  plugins: [
    usePersistedOperations({
      getPersistedOperation: (hash) => persistedOperations.get(hash) ?? null,
      allowArbitraryOperations: !config.persistedOperationsOnly,
    }),
    useBlockIntrospection({ enabled: config.persistedOperationsOnly }),
  ],
});

createServer(yoga).listen(config.port, () => {
  console.info(`BFF listening on http://localhost:${config.port}${yoga.graphqlEndpoint}`);
});
