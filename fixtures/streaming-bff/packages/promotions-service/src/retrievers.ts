import type { RestClient } from '@streaming/http-client';
import type { PromotionDto } from './types';

export async function getActivePromotions(client: RestClient, region: string): Promise<PromotionDto[]> {
  const response = await client.get<{ items: PromotionDto[] }>('/v2/promotions', {
    region,
    status: 'active',
  });
  return response.items;
}

export async function getPromotionsByIds(
  client: RestClient,
  ids: readonly string[],
): Promise<PromotionDto[]> {
  const response = await client.get<{ items: PromotionDto[] }>('/v2/promotions', { ids });
  return response.items;
}
