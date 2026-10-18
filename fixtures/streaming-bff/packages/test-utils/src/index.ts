import type { RequestInfo } from '@streaming/core-services';
import type { QueryValue, RestClient } from '@streaming/http-client';

export type FakeRoute = (query: Record<string, QueryValue>) => unknown;

export interface FakeRestClient extends RestClient {
  readonly calls: { path: string; query: Record<string, QueryValue> }[];
}

/** A RestClient that answers from in-memory routes and records every call. */
export function createFakeRestClient(name: string, routes: Record<string, FakeRoute>): FakeRestClient {
  const calls: FakeRestClient['calls'] = [];
  return {
    name,
    calls,
    async get<T>(path: string, query: Record<string, QueryValue> = {}): Promise<T> {
      calls.push({ path, query });
      const route = routes[path];
      if (!route) throw new Error(`${name}: no fake route for ${path}`);
      return route(query) as T;
    },
  };
}

export const testRequestInfo: RequestInfo = {
  brand: 'streamco',
  region: 'PT',
  channel: 'web',
  locale: 'pt-PT',
};
