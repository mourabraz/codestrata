import type { BffConfig } from '@streaming/bff-config';
import type { Clients } from '@streaming/core-services';
import { createGraphQLClient, createRestClient } from '@streaming/http-client';

export function createClients({ endpoints }: BffConfig): Clients {
  return {
    catalogApi: createRestClient({ name: 'catalog-api', baseUrl: endpoints.catalogApi }),
    peopleApi: createGraphQLClient({ name: 'people-api', endpoint: endpoints.peopleApi }),
    promotionsApi: createRestClient({ name: 'promotions-api', baseUrl: endpoints.promotionsApi }),
    availabilityApi: createRestClient({
      name: 'availability-api',
      baseUrl: endpoints.availabilityApi,
      timeoutMs: 800,
    }),
    cmsApi: createRestClient({ name: 'cms-api', baseUrl: endpoints.cmsApi }),
  };
}
