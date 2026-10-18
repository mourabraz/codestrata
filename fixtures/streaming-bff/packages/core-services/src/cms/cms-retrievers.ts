import type { RestClient } from '@streaming/http-client';
import type { CmsDocument, CmsFilters } from './cms-document';

interface CmsSearchResponse {
  results: CmsDocument[];
}

export async function getCmsDocumentByUid(
  client: RestClient,
  type: string,
  uid: string,
  filters: CmsFilters,
): Promise<CmsDocument | null> {
  const response = await client.get<CmsSearchResponse>('/documents', {
    type,
    uid,
    region: filters.region,
    channel: filters.channel,
    lang: filters.locale,
    fetchLinks: 'children',
  });
  return response.results[0] ?? null;
}
