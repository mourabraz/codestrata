export const URN_NAMESPACE = 'stream';

export type UrnEntityType = 'title' | 'person' | 'promotion' | 'view';

export interface DecodedUrn {
  type: UrnEntityType;
  id: string;
}

/** A reference to an entity by URN only. Resolvers return pointers and let the owner type load the data. */
export interface UrnPointer {
  urn: string;
}

const ENTITY_TYPES: readonly UrnEntityType[] = ['title', 'person', 'promotion', 'view'];

export function isEntityType(value: string | undefined): value is UrnEntityType {
  return ENTITY_TYPES.includes(value as UrnEntityType);
}

export function encodeUrn(type: UrnEntityType, id: string): string {
  return `urn:${URN_NAMESPACE}:${type}:${id}`;
}

export function decodeUrn(urn: string): DecodedUrn {
  const [prefix, namespace, type, ...rest] = urn.split(':');
  if (prefix !== 'urn' || namespace !== URN_NAMESPACE || !isEntityType(type) || rest.length === 0) {
    throw new Error(`Invalid URN: ${urn}`);
  }
  return { type, id: rest.join(':') };
}

export function decodeUrnOfType(urn: string, expected: UrnEntityType): string {
  const decoded = decodeUrn(urn);
  if (decoded.type !== expected) {
    throw new Error(`Expected a ${expected} URN, got ${urn}`);
  }
  return decoded.id;
}

export function toPointer(type: UrnEntityType, id: string): UrnPointer {
  return { urn: encodeUrn(type, id) };
}

/** Legacy URNs used the `urn:stream-v1:` namespace. Nothing produces them anymore. */
export function isLegacyUrn(urn: string): boolean {
  return urn.startsWith('urn:stream-v1:');
}
