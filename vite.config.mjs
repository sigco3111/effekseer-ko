// The block demo's build: index.html at the top of dist, every path relative, nothing from other hosts. public/ goes
// in as it is: Effekseer's runtime is a classic script (it needs sloppy mode), and an effect finds its files by path.
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
export default {
	root: here,
	base: './',
	publicDir: 'public',
	resolve: {
		alias: [{ find: /^patch-block$/, replacement: fileURLToPath(new URL('./lib/patch-block.js', import.meta.url)) }],
	},
	build: { target: 'es2022', outDir: `${here}dist`, emptyOutDir: true, assetsInlineLimit: 0, modulePreload: { polyfill: false } },
	server: { host: '127.0.0.1', port: 5447, strictPort: true },
};
