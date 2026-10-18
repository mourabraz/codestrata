import type { RestClient } from '@streaming/http-client';
import { decodeUrnOfType } from '@streaming/urn-codecs';
import DataLoader from 'dataloader';
import { getActivePromotions, getPromotionsByIds } from './retrievers';
import type { Promotion, PromotionDto } from './types';

function mapPromotion(dto: PromotionDto): Promotion {
  return {
    id: dto.promo_id,
    headline: dto.headline,
    description: dto.body,
    validUntil: dto.ends_at,
    titleId: dto.linked_title_id,
  };
}

export class PromotionsService {
  private readonly loader: DataLoader<string, Promotion | null>;

  constructor(private readonly promotionsApi: RestClient) {
    this.loader = new DataLoader(async (ids) => {
      const promotions = (await getPromotionsByIds(this.promotionsApi, ids)).map(mapPromotion);
      const byId = new Map(promotions.map((promotion) => [promotion.id, promotion]));
      return ids.map((id) => byId.get(id) ?? null);
    });
  }

  getPromotion(urn: string): Promise<Promotion | null> {
    return this.loader.load(decodeUrnOfType(urn, 'promotion'));
  }

  async listActive(region: string): Promise<Promotion[]> {
    const promotions = (await getActivePromotions(this.promotionsApi, region)).map(mapPromotion);
    for (const promotion of promotions) {
      this.loader.prime(promotion.id, promotion);
    }
    return promotions;
  }
}
