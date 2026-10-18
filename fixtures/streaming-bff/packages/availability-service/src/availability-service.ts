import type { RestClient } from '@streaming/http-client';
import { decodeUrnOfType } from '@streaming/urn-codecs';
import DataLoader from 'dataloader';

export interface Price {
  amount: number;
  currency: string;
}

/** Live availability of a title in a region. Changes often, so it is never cached across requests. */
export interface Availability {
  titleId: string;
  region: string;
  available: boolean;
  price: Price | null;
  updatedAt: string;
}

interface AvailabilityDto {
  title_id: string;
  region: string;
  is_available: boolean;
  price_cents: number | null;
  currency: string | null;
  updated_at: string;
}

async function getAvailability(
  client: RestClient,
  titleIds: readonly string[],
  region: string,
): Promise<AvailabilityDto[]> {
  const response = await client.get<{ data: AvailabilityDto[] }>('/live/availability', {
    titles: titleIds,
    region,
  });
  return response.data;
}

function mapAvailability(dto: AvailabilityDto): Availability {
  return {
    titleId: dto.title_id,
    region: dto.region,
    available: dto.is_available,
    price:
      dto.price_cents === null || dto.currency === null
        ? null
        : { amount: dto.price_cents / 100, currency: dto.currency },
    updatedAt: dto.updated_at,
  };
}

const keyOf = (titleId: string, region: string) => `${titleId}|${region}`;

export class AvailabilityService {
  private readonly loader: DataLoader<string, Availability | null>;

  constructor(private readonly availabilityApi: RestClient) {
    this.loader = new DataLoader(async (keys) => {
      const byRegion = new Map<string, string[]>();
      for (const key of keys) {
        const [titleId, region] = key.split('|') as [string, string];
        byRegion.set(region, [...(byRegion.get(region) ?? []), titleId]);
      }
      const results = await Promise.all(
        [...byRegion].map(([region, titleIds]) => getAvailability(this.availabilityApi, titleIds, region)),
      );
      const byKey = new Map(
        results.flat().map((dto) => [keyOf(dto.title_id, dto.region), mapAvailability(dto)]),
      );
      return keys.map((key) => byKey.get(key) ?? null);
    });
  }

  getForTitle(titleUrn: string, region: string): Promise<Availability | null> {
    return this.loader.load(keyOf(decodeUrnOfType(titleUrn, 'title'), region));
  }
}
