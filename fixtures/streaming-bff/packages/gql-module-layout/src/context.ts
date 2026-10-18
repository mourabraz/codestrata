import type { CommonContext, ContextExtensionBuilder } from '@streaming/core-services';

/** The layout module only uses the common content definition service. */
export type LayoutContextExtension = Record<never, never>;

export type LayoutModuleContext = CommonContext & LayoutContextExtension;

export const getContextExtensionBuilder: ContextExtensionBuilder<unknown, LayoutContextExtension> =
  () => () => ({});
