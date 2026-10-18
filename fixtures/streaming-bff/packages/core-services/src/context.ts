import type { Clients } from './clients';
import { ContentDefinitionService } from './content-definition-service';
import type { ContextBuilders } from './lazy-context';
import type { RequestInfo } from './request-info';

/** Services every module can rely on. Modules add their own through a context extension builder. */
export interface CommonContext {
  request: RequestInfo;
  contentDefinition: ContentDefinitionService;
}

/** Signature every GraphQL module exports as `getContextExtensionBuilder`. */
export type ContextExtensionBuilder<TClients, TExtension> = (
  clients: TClients,
) => (request: RequestInfo) => ContextBuilders<TExtension>;

export function getCommonContextBuilders(clients: Pick<Clients, 'cmsApi'>, request: RequestInfo) {
  return {
    request: () => request,
    contentDefinition: () => new ContentDefinitionService(clients.cmsApi, request),
  } satisfies ContextBuilders<CommonContext>;
}
