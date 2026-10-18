import type { RestClient } from '@streaming/http-client';
import { decodeUrnOfType } from '@streaming/urn-codecs';
import DataLoader from 'dataloader';
import { LRUCache } from 'lru-cache';
import { mapTitle } from './mappers/title-mapper';
import { getTitlesByIds, searchTitles } from './retrievers';
import type { Title } from './types';

const searchCache = new LRUCache<string, Title[]>({ max: 500, ttl: 30_000 });

export class CatalogService {
  private readonly titleLoader: DataLoader<string, Title | null>;

  constructor(private readonly catalogApi: RestClient) {
    this.titleLoader = new DataLoader(async (ids) => {
      const titles = (await getTitlesByIds(this.catalogApi, ids)).map(mapTitle);
      const byId = new Map(titles.map((title) => [title.id, title]));
      return ids.map((id) => byId.get(id) ?? null);
    });
  }

  getTitle(urn: string): Promise<Title | null> {
    return this.titleLoader.load(decodeUrnOfType(urn, 'title'));
  }

  async search(text: string, limit: number): Promise<Title[]> {
    const key = `${text.toLowerCase()}:${limit}`;
    const cached = searchCache.get(key);
    if (cached) return cached;
    const titles = (await searchTitles(this.catalogApi, text, limit)).map(mapTitle);
    for (const title of titles) {
      this.titleLoader.prime(title.id, title);
    }
    searchCache.set(key, titles);
    return titles;
  }
}
