export type Channel = 'web' | 'app';

export interface RequestInfo {
  brand: string;
  region: string;
  channel: Channel;
  locale: string;
}

export function requestInfoFromHeaders(headers: Headers): RequestInfo {
  return {
    brand: headers.get('x-brand') ?? 'streamco',
    region: headers.get('x-region') ?? 'PT',
    channel: headers.get('x-channel') === 'app' ? 'app' : 'web',
    locale: headers.get('accept-language')?.split(',')[0] ?? 'pt-PT',
  };
}
