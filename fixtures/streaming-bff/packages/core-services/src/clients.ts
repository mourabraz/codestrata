import type { GraphQLClient, RestClient } from '@streaming/http-client';

/** Clients injected by the HTTP layer. Each module picks only the ones it needs. */
export interface Clients {
  catalogApi: RestClient;
  peopleApi: GraphQLClient;
  promotionsApi: RestClient;
  availabilityApi: RestClient;
  cmsApi: RestClient;
}
