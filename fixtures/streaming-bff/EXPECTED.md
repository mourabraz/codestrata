# What the analyser must find

This is the fixture's ground truth. codestrata's tests compare the analysis result with this file. When the fixture changes, update this file.

## 1. Projects and layers (Nx)

23 projects: 20 TS projects with a `package.json` (16 packages and 4 apps: `bff`, `catalog-subgraph`, `availability-subgraph` and `mock-backends`) and 3 non-TS apps with only a `project.json` (`router`, `router-gateway` in Rust, and `docs`).

| Tag | Projects |
|---|---|
| `type:gql-module` | `gql-module-catalog`, `gql-module-availability`, `gql-module-promotions`, `gql-module-layout` |
| `layer:domain` | the catalog, availability and promotions modules |
| `layer:layout` | `gql-module-layout`, `layout-types` |
| `type:service` | `catalog-service`, `people-service`, `promotions-service`, `availability-service` |
| `type:infra` | `urn-codecs`, `http-client`, `bff-config`, `gql-common`, `envelop-plugins`, `core-services`, `layout-types` |
| `type:app` / `type:subgraph` | `bff` / `catalog-subgraph`, `availability-subgraph` |

Implicit dependencies: `router` → both subgraphs; `router-gateway` → `router`.

## 2. Schema: who owns what

| Type | Defined in | Subgraph | Notes |
|---|---|---|---|
| `Title` | catalog (owner), availability (only `availability`) | catalog + availability | `@key(fields: "urn")` entity, `__resolveReference` in both modules |
| `Person` | catalog | catalog | entity |
| `Promotion` | promotions | — (monolith only) | entity |
| `View`, `Section`, `CardGroup`, `Swimlane`, `Card` | layout | — (monolith only) | layout |
| `Availability`, `Price` | availability | availability | |
| `URN`, `Node` | gql-common | both / catalog | `Node.__resolveType` picks the type from the URN prefix |

## 3. Field → resolver → service → external API

| Field | Resolver | Service | Retriever | External call |
|---|---|---|---|---|
| `Query.title` | `gql-module-catalog/src/resolvers/query.resolvers.ts` | `CatalogService.getTitle` | `getTitlesByIds` | catalog-api `GET /titles` |
| `Query.search` | same | `CatalogService.search` | `searchTitles` | catalog-api `GET /titles/search` |
| `Query.trending` | same | **none** (see finding 3) | — | catalog-api `GET /titles/trending` |
| `Query.legacyTitles` | same | none (pointers only) | — | — |
| `Title.name`, `synopsis`, `year`, `genres`, `cast`, `similar` | `.../resolvers/title.resolvers.ts` through `loadTitle` | `CatalogService.getTitle` | `getTitlesByIds` | catalog-api `GET /titles` |
| `Person.name`, `birthYear`, `knownFor` | `.../resolvers/person.resolvers.ts` through `loadPerson` | `PeopleService.getPerson` | (DataLoader) | people-api GraphQL `PeopleByIds` (fragments `PersonSummary`, `PersonCredits`) |
| `Title.availability` | `gql-module-availability/src/resolvers/index.ts` | `AvailabilityService.getForTitle` | `getAvailability` (private) | availability-api `GET /live/availability` |
| `Query.promotions` | `gql-module-promotions/src/resolvers/query.resolvers.ts` | `PromotionsService.listActive` | `getActivePromotions` | promotions-api `GET /v2/promotions?status=active` |
| `Query.promotion` | same | `PromotionsService.getPromotion` | `getPromotionsByIds` | promotions-api `GET /v2/promotions?ids=` |
| `Promotion.headline`, `description`, `validUntil`, `title`, `displayCard` | `.../resolvers/promotion.resolvers.ts` through `loadPromotion` | `PromotionsService.getPromotion` | `getPromotionsByIds` | promotions-api |
| `Promotion.titleName` | same | `PromotionsService.getPromotion` **+ `CatalogService.getTitle`** (see finding 2) | `getPromotionsByIds`, `getTitlesByIds` | promotions-api, catalog-api |
| `Query.view` | `gql-module-layout/src/resolvers/index.ts` | `ContentDefinitionService.getView` (core-services) | `getCmsDocumentByUid` + the mapper registry | cms-api `GET /documents` |
| `View.*`, `Swimlane.*`, `Availability.*`, `Price.*` | default resolver (reads the parent object, whose type comes from the codegen `mappers`) | — | — | — |

## 4. CMS mapper registry (string dispatch)

Startup: `apps/bff/src/main.ts` → `registerAllCmsDocMappers()` (`apps/bff/src/schema.ts`) → `module.registerCmsDocMappers()` for each module in the `modules` array.

| Document type | Registered in | Function | Produces |
|---|---|---|---|
| `card_group` | `gql-module-layout/src/register-cms-mappers.ts` | `registerCmsDocWithChildrenMapper` | `CardGroupElement` |
| `swimlane` | same | `registerCmsDocMapper` | `SwimlaneElement` (URNs of any type) |
| `title_rail` | `gql-module-catalog/src/register-cms-mappers.ts` | `registerCmsDocMapper` | `SwimlaneElement` → `Title` |
| `title_card` | same | `registerCmsDocMapper` | `CardElement` → `Title` |
| `promo_card` | `gql-module-promotions/src/register-cms-mappers.ts` | `registerCmsDocMapper` | `CardElement` → `Promotion` |

Consumption: `ContentDefinitionService.loadView` → `mapCmsDocument` (`core-services/src/cms/cms-mapper-registry.ts`) → `mappers.get(doc.type)`.

## 5. Operations (persisted queries) → external APIs

| Operation | Main path | External APIs |
|---|---|---|
| `HomeView` | `Query.view` → CMS → mappers → `CardGroup.cards` / `Swimlane.items` → `Node.__resolveType` → `Title.name`, `Title.year`, `Title.availability`, `Promotion.headline` | cms, catalog, availability, promotions |
| `TitleDetail` | `Query.title` → `Title.*`, `Title.cast` → `Person.name`, `Title.similar` → `Title.name`, `Title.availability` | catalog, people, availability |
| `PromotionsList` | `Query.promotions` → `Promotion.*`; `titleName` → catalog; `title { urn }` makes no call (pointer only) | promotions, catalog |
| `SearchTitles` | `Query.search` → `Title.name`, `Title.year` (served by the DataLoader `prime`, no `GET /titles`) | catalog (`/titles/search`) |
| `TrendingRail` | `Query.trending` (direct call) → `Title.name` | catalog (`/titles/trending`, `/titles`) |

## 6. Planted findings

| # | Finding | Where |
|---|---|---|
| 1 | **Domain points to layout** (rule: layout → domain, never the reverse): `Promotion.displayCard: Card!` | `packages/gql-module-promotions/src/promotions.graphql:11`, resolver in `promotion.resolvers.ts:34` |
| 2 | **Services shared between modules** (the debt the Federation migration wants to remove): the promotions module uses the catalog module's `CatalogService` and imports `formatTitleName` from it | `packages/gql-module-promotions/src/context.ts:2,10`, `promotion.resolvers.ts:1,30-31` |
| 3 | **A resolver calls an API directly**, skipping the service/retriever (it creates the client and reads the config inside the resolver) | `packages/gql-module-catalog/src/resolvers/query.resolvers.ts:13-16` |
| 4 | **Import cycle**: `title-mapper.ts` ↔ `person-mapper.ts` | `packages/catalog-service/src/mappers/title-mapper.ts:2`, `person-mapper.ts:2` |
| 5 | **Dead code** (no use at all): `getTrendingTitleIds` (exported, never used; finding 3 duplicates it), `registeredCmsDocTypes` and, not planted, `testRequestInfo` | `catalog-service/src/retrievers.ts:14`, `core-services/src/cms/cms-mapper-registry.ts:41`, `test-utils/src/index.ts:25` |
| 6 | **Schema fields no persisted query uses**: `Person.birthYear`, `Person.knownFor`, `Query.legacyTitles`, `Query.promotion`, `Availability.region`, `Promotion.description` | the modules' schemas |
| 7 | **Deprecated field still resolved**: `Query.legacyTitles` | `catalog.graphql:22` |
| 8 | **Test dependency declared as a regular dependency**: `catalog-service` → `test-utils` | `packages/catalog-service/package.json` |
| 9 | **CMS document type without a mapper**: `legacy_banner` (silently dropped). Only visible at runtime, with the mocks; statically one can only list the registered types | `apps/mock-backends/src/main.ts` |
| 10 | **Undeclared dependencies** (not planted; the spike found it): the `gqltypes.generated.ts` files import packages the module's `package.json` does not declare. They only resolve thanks to the tsconfig `paths`. They are `@streaming/availability-service` in catalog, layout and promotions, and `@streaming/layout-types` in availability | `packages/gql-module-*/src/gqltypes.generated.ts` (origin: `mappers` in `codegen.ts`) |
| 11 | **Used only by tests**: `isLegacyUrn` has 2 tests and 0 uses in production code. It must stand out as "tested but unused" | `urn-codecs/src/index.ts:46`, tests in `urn-codecs/src/index.test.ts:15,19` |

## 7. Patterns that are hard for static analysis (on purpose)

- **Lazy context**: `context.catalog` is a Proxy at runtime (`core-services/src/lazy-context.ts`). Statically, the type comes from the codegen `contextType` (`CatalogModuleContext`), and that is how the resolver is linked to `CatalogService`.
- **Resolver maps** spread across several files, identifiable by the generated types (`GQLTitleResolvers`, `GQLResolvers`) and merged at runtime with `mergeResolvers` over an array of module namespaces.
- **Schema loaded at runtime**: `loadFilesSync(join(import.meta.dirname, 'catalog.graphql'))`.
- **String dispatch**: `Node.__resolveType` by URN prefix, and the CMS mapper registry by document type.
- **DataLoader indirection**: `getTitle` → `titleLoader.load` → batch closure → `getTitlesByIds`.
- **External GraphQL client**: queries in template strings with interpolated fragments, typed by codegen.
- **Persisted queries** stored by the SHA-256 hash of the document.
- **Generated files** (`*.generated.ts`, `apps/bff/schema.graphql`, `apps/router/supergraph.graphql`): to be used as a source of types and hidden from the map.
- **Non-TS projects** (`router`, `router-gateway` in Rust, `docs`): appear as nodes, without internal analysis.
