import { join } from 'node:path';
import { loadFilesSync } from '@graphql-tools/load-files';

export const typedefs = loadFilesSync(join(import.meta.dirname, 'catalog.graphql'));
