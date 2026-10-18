import type { Plugin } from '@envelop/core';
import { NoSchemaIntrospectionCustomRule } from 'graphql';

/** Rejects introspection queries. Enabled in production, where only persisted operations are accepted. */
export function useBlockIntrospection(options: { enabled: boolean }): Plugin {
  return {
    onValidate({ addValidationRule }) {
      if (options.enabled) {
        addValidationRule(NoSchemaIntrospectionCustomRule);
      }
    },
  };
}
