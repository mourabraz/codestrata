// Usage: node scripts/bench.ts [dataset...]
// Starts the Vite dev server, drives the page with headless Chromium (software WebGL) and records
// timings, pan/zoom frame rate and a screenshot for every renderer × scenario.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';

type Lib = 'sigma' | 'sigma3' | 'cy-canvas' | 'cy-webgl';
interface Case {
  dataset: string;
  scenario: 'projects' | 'project-files' | 'ego' | 'full';
  limit?: number;
}

const root = join(import.meta.dirname, '..');
const outDir = join(root, 'results');
mkdirSync(join(outDir, 'shots'), { recursive: true });

const datasets = process.argv.slice(2).length ? process.argv.slice(2) : ['hive', 'twenty'];
const cases: Case[] = datasets.flatMap((dataset): Case[] => [
  { dataset, scenario: 'projects' },
  { dataset, scenario: 'project-files' },
  { dataset, scenario: 'ego' },
  ...(dataset === 'twenty'
    ? [{ dataset, scenario: 'full' as const, limit: 5000 }, { dataset, scenario: 'full' as const, limit: 20000 }, { dataset, scenario: 'full' as const, limit: 40000 }]
    : [{ dataset, scenario: 'full' as const, limit: 40000 }]),
]);
const libs: Lib[] = (process.env.LIBS?.split(',') as Lib[] | undefined) ?? ['sigma', 'sigma3', 'cy-canvas', 'cy-webgl'];

const server = await createServer({ root, server: { port: 5199, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] });

const results: Record<string, unknown>[] = [];
for (const c of cases) {
  for (const lib of libs) {
    const label = `${c.dataset}-${c.scenario}${c.limit ? `-${c.limit}` : ''}-${lib}`;
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    try {
      await page.goto('http://127.0.0.1:5199/', { waitUntil: 'load' });
      await page.waitForFunction(() => 'spike' in window);
      const metrics = await page.evaluate(
        async ({ lib, c }) => {
          const spike = (window as unknown as { spike: { run: (cfg: object) => Promise<Record<string, unknown>> } }).spike;
          const m = await spike.run({ lib, ...c });
          const webglCanvases = [...document.querySelectorAll('#stage canvas')].filter((canvas) => (canvas as HTMLCanvasElement).getContext('2d') === null).length;
          return { ...m, webglCanvases };
        },
        { lib, c },
      );
      await page.screenshot({ path: join(outDir, 'shots', `${label}.png`) });
      Object.assign(
        metrics,
        await page.evaluate(async () => {
          const spike = (window as unknown as { spike: { bench: (ms: number) => Promise<Record<string, unknown>> } }).spike;
          const m = await spike.bench(3000);
          return { fps: m?.fps, drawnFps: m?.drawnFps };
        }),
      );
      results.push({ label, ...metrics });
      console.log(label.padEnd(44), JSON.stringify(metrics));
    } catch (error) {
      results.push({ label, error: String(error).split('\n')[0] });
      console.log(label.padEnd(44), 'FAILED', String(error).split('\n')[0]);
    } finally {
      await page.close();
    }
  }
}

writeFileSync(join(outDir, `bench-${datasets.join('-')}${process.env.LIBS ? `-${process.env.LIBS}` : ''}.json`), JSON.stringify(results, null, 2));
await browser.close();
await server.close();
