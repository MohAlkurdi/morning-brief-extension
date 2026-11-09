import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const svg = readFileSync(new URL('../icons/icon.svg', import.meta.url), 'utf8');
const browser = await chromium.launch();
for (const n of [16, 32, 48, 128]) {
  const page = await browser.newPage({ viewport: { width: n, height: n }, deviceScaleFactor: 1 });
  await page.setContent(`<style>html,body{margin:0;background:transparent}</style>${svg.replace('<svg ', `<svg width="${n}" height="${n}" `)}`);
  await page.screenshot({ path: new URL(`../icons/icon-${n}.png`, import.meta.url).pathname, omitBackground: true });
}
await browser.close();
