// Builds the Effekseer block's demo into dist/ (index.html at the top), with its licences and the Effect choice's
// pictures: `npm install`, then `npm run build`. The pictures come from make-thumbs.mjs and are kept in the repo.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, 'dist');
execSync('node make-recipe.mjs', { cwd: here, stdio: 'inherit' });
execSync(`node "${path.join(here, 'node_modules/vite/bin/vite.js')}" build --config vite.config.mjs`, { cwd: here, stdio: 'inherit' });
fs.cpSync(path.join(here, 'thumbs'), path.join(dist, 'thumbs'), { recursive: true });
fs.copyFileSync(path.join(here, 'vendor/effekseer/LICENSE'), path.join(dist, 'LICENSE-effekseer.txt'));
fs.copyFileSync(path.join(here, 'vendor/effekseer/SAMPLES-LICENCE-readme.txt'), path.join(dist, 'LICENCE-effects.txt'));
fs.copyFileSync(path.join(here, 'fonts/OFL-red-hat-mono.txt'), path.join(dist, 'OFL-red-hat-mono.txt'));
fs.copyFileSync(path.join(here, 'CREDITS.txt'), path.join(dist, 'CREDITS.txt'));

let bytes = 0;
let count = 0;
const sum = (dir) => {
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, e.name);
		if (e.isDirectory()) sum(p);
		else {
			bytes += fs.statSync(p).size;
			count++;
		}
	}
};
sum(dist);
console.log(`dist: ${count} files, ${(bytes / 1048576).toFixed(2)} MB`);
