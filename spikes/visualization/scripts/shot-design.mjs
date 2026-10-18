// Screenshots the design prototype (one look before publishing). Lives here because Playwright is installed here.
import { chromium } from 'playwright';
const [file, outPrefix] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(`file://${file}`);
await page.waitForTimeout(800);
for (const view of ['layers', 'usage', 'trace', 'matrix', 'areas']) {
  await page.click(`[data-view="${view}"]`);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outPrefix}-${view}.png` });
}
console.log(errors.length ? `errors:\n${errors.join('\n')}` : 'no page errors');
await browser.close();
