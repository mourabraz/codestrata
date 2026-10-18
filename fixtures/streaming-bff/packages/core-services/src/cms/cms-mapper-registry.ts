import type { ViewElement } from '@streaming/layout-types';
import type { CmsDocument } from './cms-document';

export type CmsDocMapper = (doc: CmsDocument) => ViewElement | null;
export type CmsDocWithChildrenMapper = (doc: CmsDocument, children: ViewElement[]) => ViewElement | null;

type RegisteredMapper =
  | { kind: 'leaf'; map: CmsDocMapper }
  | { kind: 'with_children'; map: CmsDocWithChildrenMapper };

const mappers = new Map<string, RegisteredMapper>();

function assertNotRegistered(type: string): void {
  if (mappers.has(type)) {
    throw new Error(`A CMS mapper is already registered for document type "${type}"`);
  }
}

/** Registers the mapper for a CMS document type. Modules call this at startup. */
export function registerCmsDocMapper(type: string, map: CmsDocMapper): void {
  assertNotRegistered(type);
  mappers.set(type, { kind: 'leaf', map });
}

/** Like registerCmsDocMapper, but the mapper also receives its already-mapped children. */
export function registerCmsDocWithChildrenMapper(type: string, map: CmsDocWithChildrenMapper): void {
  assertNotRegistered(type);
  mappers.set(type, { kind: 'with_children', map });
}

export function mapCmsDocument(doc: CmsDocument): ViewElement | null {
  const entry = mappers.get(doc.type);
  if (!entry) return null;
  if (entry.kind === 'leaf') return entry.map(doc);
  const children = (doc.children ?? [])
    .map(mapCmsDocument)
    .filter((element): element is ViewElement => element !== null);
  return entry.map(doc, children);
}

export function registeredCmsDocTypes(): string[] {
  return [...mappers.keys()];
}
