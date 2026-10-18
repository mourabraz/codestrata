// Usage: node src/fast-pass.ts <repo-root> [--workers N]
import { mkdirSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { Worker } from 'node:worker_threads';
import { analyseFiles, emptyStats, type FastStats, mergeStats } from './fast-worker.ts';
import { listSourceFiles, mb } from './files.ts';

const root = resolve(process.argv[2] ?? '.');
const workersArg = process.argv.indexOf('--workers');
const workers = workersArg > 0 ? Number(process.argv[workersArg + 1]) : 1;
const options = { calls: !process.argv.includes('--no-calls'), raw: process.argv.includes('--raw') };
const variant = `w${workers}${options.calls ? '' : '-nocalls'}${options.raw ? '-raw' : ''}`;

let peakRss = 0;
const sampler = setInterval(() => (peakRss = Math.max(peakRss, process.memoryUsage().rss)), 50);

const t0 = performance.now();
const files = listSourceFiles(root);
const listMs = performance.now() - t0;
const byKind = Object.groupBy(files, (f) => f.kind);
// Declarations are type-only inputs; the map is built from code files.
const paths = files.filter((f) => f.kind !== 'declaration').map((f) => f.path);

const t1 = performance.now();
let stats: FastStats;
if (workers <= 1) {
  stats = analyseFiles(root, paths, options);
} else {
  const chunks = Array.from({ length: workers }, (_, i) => paths.filter((_, j) => j % workers === i));
  const results = await Promise.all(
    chunks.map(
      (chunk) =>
        new Promise<FastStats>((done, fail) => {
          const worker = new Worker(new URL('./fast-worker.ts', import.meta.url), { workerData: { root, paths: chunk, options } });
          worker.once('message', done);
          worker.once('error', fail);
        }),
    ),
  );
  stats = emptyStats();
  for (const result of results) mergeStats(stats, result);
}
const analyseMs = performance.now() - t1;
clearInterval(sampler);
peakRss = Math.max(peakRss, process.memoryUsage().rss);

const totalCalls = Object.values(stats.calls).reduce((a, b) => a + b, 0);
const totalImports = Object.values(stats.imports).reduce((a, b) => a + b, 0);
const report = {
  repo: basename(root),
  workers,
  options,
  cpus: availableParallelism(),
  files: Object.fromEntries(Object.entries(byKind).map(([k, v]) => [k, v?.length ?? 0])),
  analysedFiles: stats.files,
  sourceMB: mb(stats.bytes),
  wallMs: { list: Math.round(listMs), analyse: Math.round(analyseMs), total: Math.round(listMs + analyseMs) },
  cpuMsSummedOverWorkers: {
    read: Math.round(stats.readMs),
    parse: Math.round(stats.parseMs),
    visit: Math.round(stats.visitMs),
    resolve: Math.round(stats.resolveMs),
  },
  peakRssMB: mb(peakRss),
  parseErrors: stats.parseErrors,
  imports: { ...stats.imports, total: totalImports },
  calls: { ...stats.calls, total: totalCalls },
  callsNeedingTypesPct: totalCalls ? Math.round((stats.calls.memberNeedsTypes / totalCalls) * 1000) / 10 : null,
  unresolvedSamples: stats.unresolvedSamples,
};

mkdirSync(join(import.meta.dirname, '..', 'results'), { recursive: true });
writeFileSync(
  join(import.meta.dirname, '..', 'results', `${report.repo}-fast-${variant}.json`),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
