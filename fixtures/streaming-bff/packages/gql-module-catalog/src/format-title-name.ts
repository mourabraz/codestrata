import type { Title } from '@streaming/catalog-service';

export function formatTitleName(title: Pick<Title, 'name' | 'year'>): string {
  return title.year ? `${title.name} (${title.year})` : title.name;
}
