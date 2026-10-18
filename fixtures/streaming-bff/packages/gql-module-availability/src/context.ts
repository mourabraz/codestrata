import { AvailabilityService } from '@streaming/availability-service';
import type { Clients, CommonContext, ContextExtensionBuilder } from '@streaming/core-services';

export interface AvailabilityContextExtension {
  availability: AvailabilityService;
}

export type AvailabilityModuleContext = CommonContext & AvailabilityContextExtension;

export const getContextExtensionBuilder: ContextExtensionBuilder<
  Pick<Clients, 'availabilityApi'>,
  AvailabilityContextExtension
> = (clients) => () => ({
  availability: () => new AvailabilityService(clients.availabilityApi),
});
