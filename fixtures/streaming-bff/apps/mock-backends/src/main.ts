// Fake versions of every external backend the BFF calls, on the ports from bff-config's default.json.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { loadConfig } from '@streaming/bff-config';

type Handler = (url: URL, body: unknown) => unknown;

const titles: Record<string, { title: string; year: number; cast: string[]; similar: string[] }> = {
  'tt-1': { title: 'The Long Harbour', year: 2021, cast: ['p-1', 'p-2'], similar: ['tt-2'] },
  'tt-2': { title: 'Salt and Iron', year: 2019, cast: ['p-2'], similar: ['tt-1', 'tt-3'] },
  'tt-3': { title: 'Night Ferry', year: 2023, cast: ['p-3'], similar: [] },
};

const people: Record<string, { displayName: string; birthYear: number; titles: string[] }> = {
  'p-1': { displayName: 'Ana Moreira', birthYear: 1985, titles: ['tt-1'] },
  'p-2': { displayName: 'Rui Tavares', birthYear: 1979, titles: ['tt-1', 'tt-2'] },
  'p-3': { displayName: 'Inês Lobo', birthYear: 1992, titles: ['tt-3'] },
};

const promotions = [
  {
    promo_id: 'pr-1',
    headline: 'New season: The Long Harbour',
    body: null,
    ends_at: '2026-12-31',
    regions: ['PT'],
    linked_title_id: 'tt-1',
  },
  {
    promo_id: 'pr-2',
    headline: 'Three months for the price of one',
    body: 'Annual plans only',
    ends_at: null,
    regions: ['PT', 'ES'],
    linked_title_id: null,
  },
];

const titleDto = (id: string) => {
  const title = titles[id];
  if (!title) return null;
  return {
    id,
    title: title.title,
    synopsis: `Synopsis of ${title.title}`,
    release_year: title.year,
    genres: ['drama'],
    cast: title.cast.map((personId, index) => ({ person_id: personId, character: null, billing: index + 1 })),
    similar: title.similar,
  };
};

const list = (url: URL, name: string) => url.searchParams.get(name)?.split(',').filter(Boolean) ?? [];

const backends: Record<keyof ReturnType<typeof loadConfig>['endpoints'], Handler> = {
  catalogApi: (url) => {
    if (url.pathname === '/titles') return { titles: list(url, 'ids').map(titleDto).filter(Boolean) };
    if (url.pathname === '/titles/search') {
      const q = (url.searchParams.get('q') ?? '').toLowerCase();
      return {
        results: Object.keys(titles)
          .filter((id) => titles[id]?.title.toLowerCase().includes(q))
          .map(titleDto),
      };
    }
    if (url.pathname === '/titles/trending') return { ids: ['tt-3', 'tt-1'] };
    return undefined;
  },
  peopleApi: (_url, body) => {
    const ids = (body as { variables?: { ids?: string[] } }).variables?.ids ?? [];
    return {
      data: {
        people: ids.flatMap((id) => {
          const person = people[id];
          return person
            ? [
                {
                  id,
                  displayName: person.displayName,
                  birthYear: person.birthYear,
                  credits: person.titles.map((titleId) => ({ titleId, role: 'actor' })),
                },
              ]
            : [];
        }),
      },
    };
  },
  promotionsApi: (url) => {
    const ids = list(url, 'ids');
    const region = url.searchParams.get('region');
    return {
      items: promotions.filter((p) =>
        ids.length ? ids.includes(p.promo_id) : !region || p.regions.includes(region),
      ),
    };
  },
  availabilityApi: (url) => {
    const region = url.searchParams.get('region') ?? 'PT';
    return {
      data: list(url, 'titles').map((id, index) => ({
        title_id: id,
        region,
        is_available: index % 2 === 0,
        price_cents: index % 2 === 0 ? 399 : null,
        currency: index % 2 === 0 ? 'EUR' : null,
        updated_at: '2026-10-18T10:00:00Z',
      })),
    };
  },
  cmsApi: (url) => {
    if (url.searchParams.get('type') !== 'view' || url.searchParams.get('uid') !== 'home')
      return { results: [] };
    return {
      results: [
        {
          id: 'doc-home',
          uid: 'home',
          type: 'view',
          data: { title: 'Home' },
          children: [
            {
              id: 'doc-hero',
              uid: 'hero',
              type: 'card_group',
              data: { heading: 'Featured' },
              children: [
                {
                  id: 'doc-c1',
                  uid: 'c1',
                  type: 'title_card',
                  data: { label: 'Watch now', title_id: 'tt-1' },
                },
                {
                  id: 'doc-c2',
                  uid: 'c2',
                  type: 'promo_card',
                  data: { headline: 'Annual plan offer', promo_id: 'pr-2' },
                },
              ],
            },
            {
              id: 'doc-rail',
              uid: 'rail',
              type: 'title_rail',
              data: { heading: 'Drama', title_ids: ['tt-2', 'tt-3'] },
            },
            {
              id: 'doc-mixed',
              uid: 'mixed',
              type: 'swimlane',
              data: { heading: 'Picks', item_urns: ['urn:stream:title:tt-1', 'urn:stream:promotion:pr-1'] },
            },
            { id: 'doc-unknown', uid: 'legacy', type: 'legacy_banner', data: {} },
          ],
        },
      ],
    };
  },
};

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : undefined;
}

function serve(name: string, endpoint: string, handler: Handler): void {
  const port = Number(new URL(endpoint).port);
  createServer(async (request: IncomingMessage, response: ServerResponse) => {
    const url = new URL(request.url ?? '/', endpoint);
    const result = handler(url, await readBody(request));
    response.writeHead(result === undefined ? 404 : 200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(result ?? { error: 'not found' }));
  }).listen(port, () => console.info(`mock ${name} on :${port}`));
}

const { endpoints } = loadConfig({ brand: 'streamco', env: 'local' });
for (const [name, handler] of Object.entries(backends) as [keyof typeof endpoints, Handler][]) {
  serve(name, endpoints[name], handler);
}
