import {
  type Clients,
  type CommonContext,
  createLazyContext,
  getCommonContextBuilders,
  type RequestInfo,
} from '@streaming/core-services';
import * as availability from '@streaming/gql-module-availability';
import * as catalog from '@streaming/gql-module-catalog';
import * as layout from '@streaming/gql-module-layout';
import * as promotions from '@streaming/gql-module-promotions';

export type BffContext = CommonContext &
  catalog.CatalogContextExtension &
  availability.AvailabilityContextExtension &
  promotions.PromotionsContextExtension &
  layout.LayoutContextExtension;

/** Composes the common context with every module's extension into one lazy per-request context. */
export function createContextFactory(clients: Clients): (request: RequestInfo) => BffContext {
  const extensionBuilders = {
    catalog: catalog.getContextExtensionBuilder(clients),
    availability: availability.getContextExtensionBuilder(clients),
    promotions: promotions.getContextExtensionBuilder(clients),
    layout: layout.getContextExtensionBuilder(clients),
  };

  return (request) =>
    createLazyContext<BffContext>({
      ...getCommonContextBuilders(clients, request),
      ...extensionBuilders.catalog(request),
      ...extensionBuilders.availability(request),
      ...extensionBuilders.promotions(request),
      ...extensionBuilders.layout(request),
    });
}
