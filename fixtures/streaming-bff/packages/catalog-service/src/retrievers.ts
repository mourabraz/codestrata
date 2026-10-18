import type { RestClient } from '@streaming/http-client';
import type { TitleDto } from './types';

export async function getTitlesByIds(client: RestClient, ids: readonly string[]): Promise<TitleDto[]> {
  const response = await client.get<{ titles: TitleDto[] }>('/titles', { ids });
  return response.titles;
}

export async function searchTitles(client: RestClient, text: string, limit: number): Promise<TitleDto[]> {
  const response = await client.get<{ results: TitleDto[] }>('/titles/search', { q: text, limit });
  return response.results;
}

export async function getTrendingTitleIds(client: RestClient, region: string): Promise<string[]> {
  const response = await client.get<{ ids: string[] }>('/titles/trending', { region });
  return response.ids;
}
