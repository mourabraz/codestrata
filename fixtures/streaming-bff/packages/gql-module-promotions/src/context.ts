import type { Clients, CommonContext, ContextExtensionBuilder } from '@streaming/core-services';
import type { CatalogContextExtension } from '@streaming/gql-module-catalog';
import { PromotionsService } from '@streaming/promotions-service';

export interface PromotionsContextExtension {
  promotions: PromotionsService;
}

// Also sees the catalog module's services, because Promotion.titleName reads from the catalog service.
export type PromotionsModuleContext = CommonContext & PromotionsContextExtension & CatalogContextExtension;

export const getContextExtensionBuilder: ContextExtensionBuilder<
  Pick<Clients, 'promotionsApi'>,
  PromotionsContextExtension
> = (clients) => () => ({
  promotions: () => new PromotionsService(clients.promotionsApi),
});
