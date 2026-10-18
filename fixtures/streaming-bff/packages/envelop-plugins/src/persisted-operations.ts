import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type PersistedOperationStore = ReadonlyMap<string, string>;

/** Loads every `.graphql` file in `dir`, keyed by the sha256 hash of its contents (APQ style). */
export function loadPersistedOperations(dir: string): PersistedOperationStore {
  const store = new Map<string, string>();
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.graphql')) continue;
    const document = readFileSync(join(dir, file), 'utf8');
    store.set(createHash('sha256').update(document).digest('hex'), document);
  }
  return store;
}
