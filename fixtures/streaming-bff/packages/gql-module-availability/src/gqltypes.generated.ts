import type { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import type { UrnPointer } from '@streaming/urn-codecs';
import type { ViewDefinition, CardGroupElement, SwimlaneElement, CardElement } from '@streaming/layout-types';
import type { Availability } from '@streaming/availability-service';
import type { AvailabilityModuleContext } from './context';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** Global object identifier, e.g. urn:stream:title:tt-42 */
  URN: { input: string; output: string; }
  _FieldSet: { input: unknown; output: unknown; }
};

export type GQLAvailability = {
  __typename?: 'Availability';
  available: Scalars['Boolean']['output'];
  price?: Maybe<GQLPrice>;
  region: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type GQLCard = {
  __typename?: 'Card';
  imageUrl?: Maybe<Scalars['String']['output']>;
  label: Scalars['String']['output'];
  target: GQLNode;
};

export type GQLCardGroup = {
  __typename?: 'CardGroup';
  cards: Array<GQLCard>;
  heading: Scalars['String']['output'];
};

/** Every identifiable entity exposes its URN. Resolvers receive only the URN and load the rest. */
export type GQLNode = {
  urn: Scalars['URN']['output'];
};

export type GQLPerson = GQLNode & {
  __typename?: 'Person';
  birthYear?: Maybe<Scalars['Int']['output']>;
  knownFor: Array<GQLTitle>;
  name: Scalars['String']['output'];
  urn: Scalars['URN']['output'];
};

export type GQLPrice = {
  __typename?: 'Price';
  amount: Scalars['Float']['output'];
  currency: Scalars['String']['output'];
};

export type GQLPromotion = GQLNode & {
  __typename?: 'Promotion';
  description?: Maybe<Scalars['String']['output']>;
  /** How the promotion looks as a card. */
  displayCard: GQLCard;
  headline: Scalars['String']['output'];
  /** Pointer to the promoted title (resolved by the catalog module). */
  title?: Maybe<GQLTitle>;
  /** Formatted title name, fetched from the catalog service by this module. */
  titleName?: Maybe<Scalars['String']['output']>;
  urn: Scalars['URN']['output'];
  validUntil?: Maybe<Scalars['String']['output']>;
};

export type GQLQuery = {
  __typename?: 'Query';
  /** @deprecated Use title(urn:) instead */
  legacyTitles: Array<GQLTitle>;
  promotion?: Maybe<GQLPromotion>;
  promotions: Array<GQLPromotion>;
  search: Array<GQLTitle>;
  title?: Maybe<GQLTitle>;
  trending: Array<GQLTitle>;
  view?: Maybe<GQLView>;
};


export type GQLQueryLegacyTitlesArgs = {
  ids: Array<Scalars['String']['input']>;
};


export type GQLQueryPromotionArgs = {
  urn: Scalars['URN']['input'];
};


export type GQLQueryPromotionsArgs = {
  region?: InputMaybe<Scalars['String']['input']>;
};


export type GQLQuerySearchArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  text: Scalars['String']['input'];
};


export type GQLQueryTitleArgs = {
  urn: Scalars['URN']['input'];
};


export type GQLQueryViewArgs = {
  urn: Scalars['URN']['input'];
};

export type GQLSection = GQLCardGroup | GQLSwimlane;

export type GQLSwimlane = {
  __typename?: 'Swimlane';
  heading: Scalars['String']['output'];
  items: Array<GQLNode>;
};

/** Owned by the catalog module. This module only contributes the live availability field. */
export type GQLTitle = GQLNode & {
  __typename?: 'Title';
  availability?: Maybe<GQLAvailability>;
  cast: Array<GQLPerson>;
  genres: Array<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  similar: Array<GQLTitle>;
  synopsis?: Maybe<Scalars['String']['output']>;
  urn: Scalars['URN']['output'];
  year?: Maybe<Scalars['Int']['output']>;
};


/** Owned by the catalog module. This module only contributes the live availability field. */
export type GQLTitleAvailabilityArgs = {
  region?: InputMaybe<Scalars['String']['input']>;
};

/** A screen (home, title page, ...) defined in the CMS as an ordered list of sections. */
export type GQLView = GQLNode & {
  __typename?: 'View';
  sections: Array<GQLSection>;
  title: Scalars['String']['output'];
  urn: Scalars['URN']['output'];
};



export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ReferenceResolver<TResult, TReference, TContext> = (
      reference: TReference,
      context: TContext,
      info: GraphQLResolveInfo
    ) => Promise<TResult> | TResult;

      type ScalarCheck<T, S> = S extends true ? T : NullableCheck<T, S>;
      type NullableCheck<T, S> = Maybe<T> extends T ? Maybe<ListCheck<NonNullable<T>, S>> : ListCheck<T, S>;
      type ListCheck<T, S> = T extends (infer U)[] ? NullableCheck<U, S>[] : GraphQLRecursivePick<T, S>;
      export type GraphQLRecursivePick<T, S> = { [K in keyof T & keyof S]: ScalarCheck<T[K], S[K]> };
    

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

/** Mapping of federation types */
export type GQLFederationTypes = {
  Person: GQLPerson;
  Promotion: GQLPromotion;
  Title: GQLTitle;
};

/** Mapping of federation reference types */
export type GQLFederationReferenceTypes = {
  Person:
    ( { __typename: 'Person' }
    & GraphQLRecursivePick<GQLFederationTypes['Person'], {"urn":true}> );
  Promotion:
    ( { __typename: 'Promotion' }
    & GraphQLRecursivePick<GQLFederationTypes['Promotion'], {"urn":true}> );
  Title:
    ( { __typename: 'Title' }
    & GraphQLRecursivePick<GQLFederationTypes['Title'], {"urn":true}> );
};

/** Mapping of union types */
export type GQLResolversUnionTypes<_RefType extends Record<string, unknown>> = {
  Section:
    | ( CardGroupElement )
    | ( SwimlaneElement )
  ;
};

/** Mapping of interface types */
export type GQLResolversInterfaceTypes<_RefType extends Record<string, unknown>> = {
  Node:
    | ( UrnPointer )
    | ( UrnPointer )
    | ( UrnPointer )
    | ( ViewDefinition )
  ;
};

/** Mapping between all available schema types and the resolvers types */
export type GQLResolversTypes = {
  Availability: ResolverTypeWrapper<Availability>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Card: ResolverTypeWrapper<CardElement>;
  CardGroup: ResolverTypeWrapper<CardGroupElement>;
  Node: ResolverTypeWrapper<GQLResolversInterfaceTypes<GQLResolversTypes>['Node']>;
  Person: ResolverTypeWrapper<UrnPointer>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Price: ResolverTypeWrapper<GQLPrice>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  Promotion: ResolverTypeWrapper<UrnPointer>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Section: ResolverTypeWrapper<GQLResolversUnionTypes<GQLResolversTypes>['Section']>;
  Swimlane: ResolverTypeWrapper<SwimlaneElement>;
  Title: ResolverTypeWrapper<UrnPointer>;
  URN: ResolverTypeWrapper<Scalars['URN']['output']>;
  View: ResolverTypeWrapper<ViewDefinition>;
};

/** Mapping between all available schema types and the resolvers parents */
export type GQLResolversParentTypes = {
  Availability: Availability;
  Boolean: Scalars['Boolean']['output'];
  String: Scalars['String']['output'];
  Card: CardElement;
  CardGroup: CardGroupElement;
  Node: GQLResolversInterfaceTypes<GQLResolversParentTypes>['Node'];
  Person: UrnPointer;
  Int: Scalars['Int']['output'];
  Price: GQLPrice;
  Float: Scalars['Float']['output'];
  Promotion: UrnPointer;
  Query: Record<PropertyKey, never>;
  Section: GQLResolversUnionTypes<GQLResolversParentTypes>['Section'];
  Swimlane: SwimlaneElement;
  Title: UrnPointer;
  URN: Scalars['URN']['output'];
  View: ViewDefinition;
};

export type GQLAvailabilityResolvers<ContextType = AvailabilityModuleContext, ParentType extends GQLResolversParentTypes['Availability'] = GQLResolversParentTypes['Availability']> = {
  available?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>;
  price?: Resolver<Maybe<GQLResolversTypes['Price']>, ParentType, ContextType>;
  region?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>;
};

export type GQLCardResolvers<ContextType = AvailabilityModuleContext, ParentType extends GQLResolversParentTypes['Card'] = GQLResolversParentTypes['Card']> = {
  imageUrl?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>;
  label?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>;
  target?: Resolver<GQLResolversTypes['Node'], ParentType, ContextType>;
};

export type GQLCardGroupResolvers<ContextType = AvailabilityModuleContext, ParentType extends GQLResolversParentTypes['CardGroup'] = GQLResolversParentTypes['CardGroup']> = {
  cards?: Resolver<Array<GQLResolversTypes['Card']>, ParentType, ContextType>;
  heading?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type GQLNodeResolvers<ContextType = AvailabilityModuleContext, ParentType extends GQLResolversParentTypes['Node'] = GQLResolversParentTypes['Node']> = {
  __resolveType: TypeResolveFn<'Person' | 'Promotion' | 'Title' | 'View', ParentType, ContextType>;
};

export type GQLPersonResolvers<ContextType = AvailabilityModuleContext, ParentType extends GQLResolversParentTypes['Person'] = GQLResolversParentTypes['Person'], FederationReferenceType extends GQLFederationReferenceTypes['Person'] = GQLFederationReferenceTypes['Person']> = {
  __resolveReference?: ReferenceResolver<Maybe<GQLResolversTypes['Person']> | FederationReferenceType, FederationReferenceType, ContextType>;
  birthYear?: Resolver<Maybe<GQLResolversTypes['Int']>, ParentType, ContextType>;
  knownFor?: Resolver<Array<GQLResolversTypes['Title']>, ParentType, ContextType>;
  name?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>;
  urn?: Resolver<GQLResolversTypes['URN'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type GQLPriceResolvers<ContextType = AvailabilityModuleContext, ParentType extends GQLResolversParentTypes['Price'] = GQLResolversParentTypes['Price']> = {
  amount?: Resolver<GQLResolversTypes['Float'], ParentType, ContextType>;
  currency?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>;
};

export type GQLPromotionResolvers<ContextType = AvailabilityModuleContext, ParentType extends GQLResolversParentTypes['Promotion'] = GQLResolversParentTypes['Promotion'], FederationReferenceType extends GQLFederationReferenceTypes['Promotion'] = GQLFederationReferenceTypes['Promotion']> = {
  __resolveReference?: ReferenceResolver<Maybe<GQLResolversTypes['Promotion']> | FederationReferenceType, FederationReferenceType, ContextType>;
  description?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>;
  displayCard?: Resolver<GQLResolversTypes['Card'], ParentType, ContextType>;
  headline?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>;
  title?: Resolver<Maybe<GQLResolversTypes['Title']>, ParentType, ContextType>;
  titleName?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>;
  urn?: Resolver<GQLResolversTypes['URN'], ParentType, ContextType>;
  validUntil?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type GQLQueryResolvers<ContextType = AvailabilityModuleContext, ParentType extends GQLResolversParentTypes['Query'] = GQLResolversParentTypes['Query']> = {
  legacyTitles?: Resolver<Array<GQLResolversTypes['Title']>, ParentType, ContextType, RequireFields<GQLQueryLegacyTitlesArgs, 'ids'>>;
  promotion?: Resolver<Maybe<GQLResolversTypes['Promotion']>, ParentType, ContextType, RequireFields<GQLQueryPromotionArgs, 'urn'>>;
  promotions?: Resolver<Array<GQLResolversTypes['Promotion']>, ParentType, ContextType, Partial<GQLQueryPromotionsArgs>>;
  search?: Resolver<Array<GQLResolversTypes['Title']>, ParentType, ContextType, RequireFields<GQLQuerySearchArgs, 'limit' | 'text'>>;
  title?: Resolver<Maybe<GQLResolversTypes['Title']>, ParentType, ContextType, RequireFields<GQLQueryTitleArgs, 'urn'>>;
  trending?: Resolver<Array<GQLResolversTypes['Title']>, ParentType, ContextType>;
  view?: Resolver<Maybe<GQLResolversTypes['View']>, ParentType, ContextType, RequireFields<GQLQueryViewArgs, 'urn'>>;
};

export type GQLSectionResolvers<ContextType = AvailabilityModuleContext, ParentType extends GQLResolversParentTypes['Section'] = GQLResolversParentTypes['Section']> = {
  __resolveType: TypeResolveFn<'CardGroup' | 'Swimlane', ParentType, ContextType>;
};

export type GQLSwimlaneResolvers<ContextType = AvailabilityModuleContext, ParentType extends GQLResolversParentTypes['Swimlane'] = GQLResolversParentTypes['Swimlane']> = {
  heading?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>;
  items?: Resolver<Array<GQLResolversTypes['Node']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type GQLTitleResolvers<ContextType = AvailabilityModuleContext, ParentType extends GQLResolversParentTypes['Title'] = GQLResolversParentTypes['Title'], FederationReferenceType extends GQLFederationReferenceTypes['Title'] = GQLFederationReferenceTypes['Title']> = {
  __resolveReference?: ReferenceResolver<Maybe<GQLResolversTypes['Title']> | FederationReferenceType, FederationReferenceType, ContextType>;
  availability?: Resolver<Maybe<GQLResolversTypes['Availability']>, ParentType, ContextType, Partial<GQLTitleAvailabilityArgs>>;
  cast?: Resolver<Array<GQLResolversTypes['Person']>, ParentType, ContextType>;
  genres?: Resolver<Array<GQLResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>;
  similar?: Resolver<Array<GQLResolversTypes['Title']>, ParentType, ContextType>;
  synopsis?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>;
  urn?: Resolver<GQLResolversTypes['URN'], ParentType, ContextType>;
  year?: Resolver<Maybe<GQLResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface GQLUrnScalarConfig extends GraphQLScalarTypeConfig<GQLResolversTypes['URN'], any> {
  name: 'URN';
}

export type GQLViewResolvers<ContextType = AvailabilityModuleContext, ParentType extends GQLResolversParentTypes['View'] = GQLResolversParentTypes['View']> = {
  sections?: Resolver<Array<GQLResolversTypes['Section']>, ParentType, ContextType>;
  title?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>;
  urn?: Resolver<GQLResolversTypes['URN'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type GQLResolvers<ContextType = AvailabilityModuleContext> = {
  Availability?: GQLAvailabilityResolvers<ContextType>;
  Card?: GQLCardResolvers<ContextType>;
  CardGroup?: GQLCardGroupResolvers<ContextType>;
  Node?: GQLNodeResolvers<ContextType>;
  Person?: GQLPersonResolvers<ContextType>;
  Price?: GQLPriceResolvers<ContextType>;
  Promotion?: GQLPromotionResolvers<ContextType>;
  Query?: GQLQueryResolvers<ContextType>;
  Section?: GQLSectionResolvers<ContextType>;
  Swimlane?: GQLSwimlaneResolvers<ContextType>;
  Title?: GQLTitleResolvers<ContextType>;
  URN?: GraphQLScalarType;
  View?: GQLViewResolvers<ContextType>;
};

