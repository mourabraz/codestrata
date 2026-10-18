// Sends every persisted operation to a running BFF (by hash, as the clients do) and prints the responses.
// Start `pnpm start:mocks` and `pnpm start:bff` first.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const BFF_URL = process.env.BFF_URL ?? 'http://localhost:4000/api';
const OPERATIONS_DIR = join(import.meta.dirname, '..', 'apps', 'bff', 'persisted-operations');

const variablesByOperation: Record<string, Record<string, unknown>> = {
  HomeView: { urn: 'urn:stream:view:home', region: 'PT' },
  TitleDetail: { urn: 'urn:stream:title:tt-1', region: 'PT' },
  PromotionsList: { region: 'PT' },
  SearchTitles: { text: 'salt' },
  TrendingRail: {},
};

let failed = false;
for (const [operationName, variables] of Object.entries(variablesByOperation)) {
  const document = readFileSync(join(OPERATIONS_DIR, `${operationName}.graphql`), 'utf8');
  const sha256Hash = createHash('sha256').update(document).digest('hex');
  const response = await fetch(BFF_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-region': 'PT' },
    body: JSON.stringify({
      operationName,
      variables,
      extensions: { persistedQuery: { version: 1, sha256Hash } },
    }),
  });
  const body = (await response.json()) as { errors?: unknown[] };
  if (body.errors?.length) failed = true;
  console.info(`\n=== ${operationName} (${response.status})\n${JSON.stringify(body, null, 2)}`);
}

process.exit(failed ? 1 : 0);
