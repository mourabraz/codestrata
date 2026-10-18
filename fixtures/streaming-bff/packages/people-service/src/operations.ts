// Queries sent to the external People API. Codegen types them into people-api.generated.ts.

export const PERSON_SUMMARY_FRAGMENT = /* GraphQL */ `
  fragment PersonSummary on Person {
    id
    displayName
    birthYear
  }
`;

export const PERSON_CREDITS_FRAGMENT = /* GraphQL */ `
  fragment PersonCredits on Person {
    credits {
      titleId
      role
    }
  }
`;

export const PEOPLE_BY_IDS_QUERY = /* GraphQL */ `
  query PeopleByIds($ids: [ID!]!) {
    people(ids: $ids) {
      ...PersonSummary
      ...PersonCredits
    }
  }
  ${PERSON_SUMMARY_FRAGMENT}
  ${PERSON_CREDITS_FRAGMENT}
`;
