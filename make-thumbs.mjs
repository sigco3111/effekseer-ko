// Writes the Effect choice's pictures, thumbs/effects/<id>.webp: each effect at its best moment on the floor, 112 x 112
// (the block page draws them at 56 x 56), captured from the demo in headless Chromium, muted.
//
//   npm run dev   (in another terminal), then: node make-thumbs.mjs [url, default http://127.0.0.1:5447/] [id,id,...]
//
// Needs Playwright's Chromium (CHROME=<path to chrome.exe> to use another) and ffmpeg (with libwebp) on PATH.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { EFFECTS } from './src/effects.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const url = process.argv[2] ?? 'http://127.0.0.1:5447/';
const only = process.argv[3]?.split(',');
const out = path.join(here, 'thumbs', 'effects');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
	executablePath: process.env.CHROME || undefined,
	headless: true,
	args: ['--mute-audio', '--ignore-gpu-blocklist', '--use-angle=d3d11'],
});
const page = await browser.newPage({ viewport: { width: 448, height: 448 } });
await page.addInitScript(() => { Element.prototype.requestPointerLock = () => Promise.resolve(); });
await page.goto(url);
await page.waitForFunction(() => window.__block?.seek, null, { timeout: 180000 });
await page.evaluate(() => {
	window.__block.values.auto = false;
	document.body.classList.remove('on'); // the labels
});
for (const { id } of EFFECTS) {
	if (only && !only.includes(id)) continue;
	await page.evaluate((i) => {
		const b = window.__block, s = b.spec[i];
		// Framed by how big it plays, and how high it stands.
		const across = Math.min(s.size ?? 7.5, 12);
		const y = Math.max(1.6, Math.min(s.top * 0.46, 6));
		b.view(0, y + across * 0.34, across * 1.72, 0, y, 0);
		b.seek(i, s.at);
		b.shot();
	}, id);
	await page.waitForTimeout(60);
	const png = path.join(out, `${id}.png`);
	await page.screenshot({ path: png });
	const webp = path.join(out, `${id}.webp`);
	execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-vf', 'scale=112:112:flags=lanczos', '-c:v', 'libwebp', '-quality', '84', webp]);
	fs.rmSync(png);
	console.log(`${id}: ${fs.statSync(webp).size} bytes`);
}
await browser.close();
