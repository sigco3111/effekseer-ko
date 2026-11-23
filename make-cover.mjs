// Writes cover.jpg, the block's cover, 1280 x 720: a few effects together on the floor, from the running demo.
//
//   npm run dev   (in another terminal), then: node make-cover.mjs [url, default http://127.0.0.1:5447/]
//
// Needs Playwright's Chromium (CHROME=<path to chrome.exe> to use another). Muted, and it can't take the mouse.
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://127.0.0.1:5447/';
const browser = await chromium.launch({
	executablePath: process.env.CHROME || undefined,
	headless: true,
	args: ['--mute-audio', '--ignore-gpu-blocklist', '--use-angle=d3d11'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.addInitScript(() => { Element.prototype.requestPointerLock = () => Promise.resolve(); });
await page.goto(url);
await page.waitForFunction(() => window.__block?.seek, null, { timeout: 180000 });
await page.evaluate(() => {
	const b = window.__block;
	b.values.auto = false;
	document.body.classList.remove('on'); // the labels
	b.view(0, 6.2, 20, 0, 3.1, 0);
	// In the order that leaves each at its best: each seek moves the earlier ones on too.
	b.seek('golden-rise', 44, { x: 1.5, z: 0 });
	b.seek('tornado', 40, { x: -9.5, z: -2, again: true });
	b.seek('hex-shield', 60, { x: 10, z: -2, again: true });
	b.seek('storm-orb', 20, { x: -4.5, z: 5, again: true });
	b.shot();
});
await page.waitForTimeout(60);
await page.screenshot({ path: new URL('./cover.jpg', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), type: 'jpeg', quality: 90 });
await browser.close();
