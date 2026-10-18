import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.nx', '.next', '.turbo', '.cache', '.repos',
]);

export interface SourceFile {
  path: string;
  kind: 'source' | 'test' | 'generated' | 'declaration';
}

export function classify(path: string): SourceFile['kind'] {
  if (path.endsWith('.d.ts')) return 'declaration';
  if (/\.generated\.tsx?$|__generated__|\/generated\//.test(path)) return 'generated';
  if (/\.(test|spec|e2e)\.tsx?$|\/__tests__\//.test(path)) return 'test';
  return 'source';
}

/** Every .ts/.tsx/.mts/.cts file under `root`, skipping build output and dependencies. */
export function listSourceFiles(root: string): SourceFile[] {
  const files: SourceFile[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(join(dir, entry.name));
      } else if (/\.(ts|tsx|mts|cts)$/.test(entry.name)) {
        const path = join(dir, entry.name);
        files.push({ path, kind: classify(path) });
      }
    }
  };
  walk(root);
  return files;
}

export function mb(bytes: number): number {
  return Math.round(bytes / 1024 / 1024);
}
