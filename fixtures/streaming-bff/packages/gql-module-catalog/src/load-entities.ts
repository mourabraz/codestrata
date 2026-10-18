import type { Title } from '@streaming/catalog-service';
import type { Person } from '@streaming/people-service';
import { GraphQLError } from 'graphql';
import type { CatalogModuleContext } from './context';

export async function loadTitle(context: CatalogModuleContext, urn: string): Promise<Title> {
  const title = await context.catalog.getTitle(urn);
  if (!title) throw new GraphQLError(`Title not found: ${urn}`, { extensions: { code: 'NOT_FOUND' } });
  return title;
}

export async function loadPerson(context: CatalogModuleContext, urn: string): Promise<Person> {
  const person = await context.people.getPerson(urn);
  if (!person) throw new GraphQLError(`Person not found: ${urn}`, { extensions: { code: 'NOT_FOUND' } });
  return person;
}
