export {
  type AvailabilityContextExtension,
  type AvailabilityModuleContext,
  getContextExtensionBuilder,
} from './context';
export { resolvers } from './resolvers';
export { typedefs } from './typedefs';

/** This module has no CMS documents. Kept so every module exports the same contract. */
export function registerCmsDocMappers(): void {}
