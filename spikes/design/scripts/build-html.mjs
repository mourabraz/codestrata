// Usage: node scripts/build-html.mjs  → prototype.html (template + embedded data, one self-contained file)
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const here = join(import.meta.dirname, '..');
const template = readFileSync(join(here, 'src', 'prototype.template.html'), 'utf8');
// Keep the embedded JSON from closing its <script> tag.
const data = readFileSync(join(here, 'data', 'prototype-data.json'), 'utf8').replaceAll('</', '<\\/');
writeFileSync(join(here, 'prototype.html'), template.replace('__DATA__', () => data));
console.log(`prototype.html: ${(Buffer.byteLength(template) / 1024).toFixed(0)} KB template + ${(data.length / 1024 / 1024).toFixed(2)} MB data`);
