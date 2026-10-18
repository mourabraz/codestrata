import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto(`file://${process.argv[2]}`);
await page.click('[data-ds="1"]');
await page.click('[data-view="usage"]');
await page.waitForTimeout(300);
console.log(await page.evaluate(() => {
  const q = (s) => [...document.querySelectorAll(s)].map((e) => Math.round(e.getBoundingClientRect().height));
  return { zones: q('#flowsec .zone'), groups: q('#flowsec .opgroup').length, routes: q('#flowsec .route').length, openGroups: document.querySelectorAll('#flowsec .opgroup[open]').length, firstRoute: document.querySelector('#flowsec .route')?.innerText.slice(0, 300), exitRouteH: q('#flowsec .exitroute').slice(0, 3), symbol: document.querySelector('.card .name')?.textContent };
}));
await browser.close();
