/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type Credit = {
  __typename?: 'Credit';
  role: Scalars['String']['output'];
  titleId: Scalars['ID']['output'];
};

export type Person = {
  __typename?: 'Person';
  birthYear?: Maybe<Scalars['Int']['output']>;
  credits: Array<Credit>;
  displayName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  photoUrl?: Maybe<Scalars['String']['output']>;
};

export type Query = {
  __typename?: 'Query';
  people: Array<Person>;
  person?: Maybe<Person>;
};


export type QueryPeopleArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type QueryPersonArgs = {
  id: Scalars['ID']['input'];
};

export type PersonSummaryFragment = { id: string, displayName: string, birthYear: number | null };

export type PersonCreditsFragment = { credits: Array<{ titleId: string, role: string }> };

export type PeopleByIdsQueryVariables = Exact<{
  ids: Array<string | number> | string | number;
}>;


export type PeopleByIdsQuery = { people: Array<{ id: string, displayName: string, birthYear: number | null, credits: Array<{ titleId: string, role: string }> }> };
