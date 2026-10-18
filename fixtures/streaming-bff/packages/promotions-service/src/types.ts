export interface PromotionDto {
  promo_id: string;
  headline: string;
  body: string | null;
  ends_at: string | null;
  regions: string[];
  linked_title_id: string | null;
}

export interface Promotion {
  id: string;
  headline: string;
  description: string | null;
  validUntil: string | null;
  titleId: string | null;
}
