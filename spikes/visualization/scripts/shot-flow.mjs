// Screenshots the Usage → Request flow section in its three formats.
import { chromium } from 'playwright';
const [file, outPrefix] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(`file://${file}`);
await page.click(`[data-ds="${process.env.DS ?? 0}"]`);
await page.click('[data-view="usage"]');
await page.waitForTimeout(300);
for (const mode of ['flow', 'path', 'sequence']) {
  await page.click(`[data-mode="${mode}"]`);
  await page.waitForTimeout(250);
  await page.locator('#flowsec').screenshot({ path: `${outPrefix}-${mode}.png` });
}
console.log(errors.length ? `errors:\n${errors.join('\n')}` : 'no page errors');
await browser.close();
