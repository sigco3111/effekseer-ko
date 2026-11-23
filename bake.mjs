// Measures every effect with the demo itself and writes src/effects.baked.json: how big each is at scale 1 and how high
// it stands, how long it lasts, whether it ends by itself, the colour and strength of its light over time, and its best
// moment for a picture. demo.js uses these to play them all at a similar size and light the floor.
//
//   npm run dev   (in another terminal), then: node bake.mjs [url, default http://127.0.0.1:5447/]
//
// Needs Playwright's Chromium (CHROME=<path to chrome.exe> to use another). Muted, and it can't take the mouse.
import fs from 'node:fs';
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://127.0.0.1:5447/';
const out = new URL('./src/effects.baked.json', import.meta.url);
const browser = await chromium.launch({
	executablePath: process.env.CHROME || undefined,
	headless: true,
	args: ['--mute-audio', '--ignore-gpu-blocklist', '--use-angle=d3d11'],
});
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
await page.addInitScript(() => { Element.prototype.requestPointerLock = () => Promise.resolve(); });
page.on('pageerror', (e) => console.log('pageerror', e.message.slice(0, 300)));
page.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text().slice(0, 300)); });
await page.goto(`${url}?bake`);
await page.waitForFunction(() => window.__block?.measure, null, { timeout: 180000 });
const ids = await page.evaluate(() => Object.keys(window.__block.spec));
const baked = {};
for (const id of ids) {
	baked[id] = await page.evaluate((i) => window.__block.measure(i), id);
	const b = baked[id];
	console.log(`${id}: ${b.w.toFixed(1)} x ${b.h.toFixed(1)}, y ${b.y0.toFixed(1)} to ${b.y1.toFixed(1)}, ${(b.life / 60).toFixed(1)} s${b.ended ? '' : '+'}, power ${b.power}, rgb ${b.rgb}, best at ${b.at}, active ${b.active}`);
}
await browser.close();
// Only now: the dev server reloads the page when this file changes.
fs.writeFileSync(out, `${JSON.stringify(baked)}\n`);
