import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFakeRestClient } from '@streaming/test-utils';
import { CatalogService } from './catalog-service';
import type { TitleDto } from './types';

const dto = (id: string): TitleDto => ({
  id,
  title: `Title ${id}`,
  synopsis: null,
  release_year: 2020,
  genres: ['drama'],
  cast: [{ person_id: 'p-1', character: 'Lead', billing: 1 }],
  similar: [],
});

test('batches title lookups into a single API call', async () => {
  const client = createFakeRestClient('catalog-api', {
    '/titles': (query) => ({ titles: String(query.ids).split(',').map(dto) }),
  });
  const service = new CatalogService(client);

  const [a, b] = await Promise.all([
    service.getTitle('urn:stream:title:tt-1'),
    service.getTitle('urn:stream:title:tt-2'),
  ]);

  assert.equal(a?.name, 'Title tt-1');
  assert.equal(b?.name, 'Title tt-2');
  assert.equal(client.calls.length, 1);
});
