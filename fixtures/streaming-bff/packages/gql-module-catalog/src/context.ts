import { CatalogService } from '@streaming/catalog-service';
import type { Clients, CommonContext, ContextExtensionBuilder } from '@streaming/core-services';
import { PeopleService } from '@streaming/people-service';

export interface CatalogContextExtension {
  catalog: CatalogService;
  people: PeopleService;
}

export type CatalogModuleContext = CommonContext & CatalogContextExtension;

export const getContextExtensionBuilder: ContextExtensionBuilder<
  Pick<Clients, 'catalogApi' | 'peopleApi'>,
  CatalogContextExtension
> = (clients) => () => ({
  catalog: () => new CatalogService(clients.catalogApi),
  people: () => new PeopleService(clients.peopleApi),
});
