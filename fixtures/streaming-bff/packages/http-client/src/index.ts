export type QueryValue = string | number | readonly string[] | undefined;

export interface RestClient {
  readonly name: string;
  get<T>(path: string, query?: Record<string, QueryValue>): Promise<T>;
}

export interface RestClientOptions {
  name: string;
  baseUrl: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export interface GraphQLClient {
  readonly name: string;
  request<TData, TVariables extends Record<string, unknown>>(
    document: string,
    variables: TVariables,
  ): Promise<TData>;
}

export interface GraphQLClientOptions {
  name: string;
  endpoint: string;
  timeoutMs?: number;
}

export class HttpError extends Error {
  constructor(
    readonly clientName: string,
    readonly status: number,
    readonly url: string,
  ) {
    super(`${clientName}: HTTP ${status} for ${url}`);
  }
}

const DEFAULT_TIMEOUT_MS = 5000;

export function createRestClient(options: RestClientOptions): RestClient {
  return {
    name: options.name,
    async get<T>(path: string, query: Record<string, QueryValue> = {}): Promise<T> {
      const url = new URL(path, options.baseUrl);
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined) continue;
        url.searchParams.set(key, typeof value === 'object' ? value.join(',') : String(value));
      }
      const response = await fetch(url, {
        headers: { accept: 'application/json', ...options.headers },
        signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new HttpError(options.name, response.status, url.toString());
      }
      return (await response.json()) as T;
    },
  };
}

export function createGraphQLClient(options: GraphQLClientOptions): GraphQLClient {
  return {
    name: options.name,
    async request<TData, TVariables extends Record<string, unknown>>(
      document: string,
      variables: TVariables,
    ): Promise<TData> {
      const response = await fetch(options.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ query: document, variables }),
        signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new HttpError(options.name, response.status, options.endpoint);
      }
      const body = (await response.json()) as { data?: TData; errors?: { message: string }[] };
      if (body.errors?.length || !body.data) {
        throw new Error(
          `${options.name}: ${body.errors?.map((e) => e.message).join('; ') ?? 'empty response'}`,
        );
      }
      return body.data;
    },
  };
}
