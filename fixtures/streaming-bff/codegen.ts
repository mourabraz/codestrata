import type { CodegenConfig } from '@graphql-codegen/cli';

// Every module is typed against the full schema, so a module can return pointers to types it does not own.
// (Per-output schemas, because a root `schema` would be merged into the People API output too.)
const bffSchema = ['packages/gql-common/src/*.graphql', 'packages/gql-module-*/src/*.graphql'];

const resolverConfig = {
  typesPrefix: 'GQL',
  federation: true,
  useTypeImports: true,
  enumsAsTypes: true,
  scalars: { URN: 'string' },
  // Entities are passed between resolvers as URN pointers only.
  mappers: {
    Title: '@streaming/urn-codecs#UrnPointer',
    Person: '@streaming/urn-codecs#UrnPointer',
    Promotion: '@streaming/urn-codecs#UrnPointer',
    View: '@streaming/layout-types#ViewDefinition',
    CardGroup: '@streaming/layout-types#CardGroupElement',
    Swimlane: '@streaming/layout-types#SwimlaneElement',
    Card: '@streaming/layout-types#CardElement',
    Availability: '@streaming/availability-service#Availability',
  },
};

const moduleTypes = (module: string, contextType: string) => ({
  [`packages/gql-module-${module}/src/gqltypes.generated.ts`]: {
    schema: bffSchema,
    plugins: ['typescript', 'typescript-resolvers'],
    config: { ...resolverConfig, contextType: `./context#${contextType}` },
  },
});

const config: CodegenConfig = {
  overwrite: true,
  generates: {
    ...moduleTypes('catalog', 'CatalogModuleContext'),
    ...moduleTypes('availability', 'AvailabilityModuleContext'),
    ...moduleTypes('promotions', 'PromotionsModuleContext'),
    ...moduleTypes('layout', 'LayoutModuleContext'),
    'packages/people-service/src/people-api.generated.ts': {
      schema: 'packages/people-service/schema/people-api.graphql',
      documents: 'packages/people-service/src/operations.ts',
      plugins: ['typescript', 'typescript-operations'],
      config: { useTypeImports: true, enumsAsTypes: true },
    },
  },
};

export default config;
