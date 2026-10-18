import type { GraphQLClient } from '@streaming/http-client';
import { decodeUrnOfType } from '@streaming/urn-codecs';
import DataLoader from 'dataloader';
import { PEOPLE_BY_IDS_QUERY } from './operations';
import type { PeopleByIdsQuery, PeopleByIdsQueryVariables } from './people-api.generated';

export interface Person {
  id: string;
  name: string;
  birthYear: number | null;
  knownForTitleIds: string[];
}

type PersonResult = PeopleByIdsQuery['people'][number];

function mapPerson(result: PersonResult): Person {
  return {
    id: result.id,
    name: result.displayName,
    birthYear: result.birthYear ?? null,
    knownForTitleIds: result.credits.map((credit) => credit.titleId),
  };
}

export class PeopleService {
  private readonly loader: DataLoader<string, Person | null>;

  constructor(private readonly peopleApi: GraphQLClient) {
    this.loader = new DataLoader(async (ids) => {
      const data = await this.peopleApi.request<PeopleByIdsQuery, PeopleByIdsQueryVariables>(
        PEOPLE_BY_IDS_QUERY,
        { ids: [...ids] },
      );
      const byId = new Map(data.people.map((person) => [person.id, mapPerson(person)]));
      return ids.map((id) => byId.get(id) ?? null);
    });
  }

  getPerson(urn: string): Promise<Person | null> {
    return this.loader.load(decodeUrnOfType(urn, 'person'));
  }
}
