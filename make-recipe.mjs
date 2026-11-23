// Writes recipe.json, the Effekseer block's demo recipe (mode browser + block): `node make-recipe.mjs`.
// demo.js reads its controls from that file.
//
// For people (blendi's standards, 2026-10-31): one way to choose, the effect in its groups with a picture each, and a
// few plain essentials; clicking in the frame casts it. Glow is for agents, in this recipe with its range and default.
//
// Every effect option has its picture, thumbs/effects/<id>.webp, a still from the demo at the effect's best moment
// (make-thumbs.mjs). `--no-images` leaves them out.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EFFECTS, GROUPS, DEFAULT_EFFECT } from './src/effects.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const images = !process.argv.includes('--no-images');
const ordered = GROUPS.flatMap((g) => EFFECTS.filter((e) => e.group === g));
const authors = [...new Set(EFFECTS.map((e) => e.author))];

const recipe = {
	mode: 'browser',
	block: {
		controls: [
			{
				id: 'effect',
				label: 'Effect',
				hint: 'Which effect plays. Click the floor in the frame to cast it there.',
				type: 'choice',
				options: ordered.map((e) => ({ value: e.id, label: e.label, group: e.group, ...(images ? { image: `thumbs/effects/${e.id}.webp` } : {}) })),
				default: DEFAULT_EFFECT,
				essential: true,
			},
			{ id: 'size', label: 'Size', hint: 'How big it plays.', type: 'number', min: 0.4, max: 2.5, step: 0.05, default: 1, unit: '×', essential: true },
			{ id: 'speed', label: 'Speed', hint: 'How fast it plays: 1 is as made.', type: 'number', min: 0.2, max: 2, step: 0.05, default: 1, unit: '×', essential: true },
			{ id: 'colour', label: 'Colour', hint: 'Turns its colours around the wheel: 0 is as made.', type: 'number', min: 0, max: 360, step: 5, default: 0, unit: '°', essential: true },
			{ id: 'auto', label: 'Keep casting', hint: 'Casts it again in the middle whenever it has finished.', type: 'toggle', default: true, essential: true },
			{ id: 'glow', label: 'Glow', hint: 'How much the bright parts bloom: 0 is the runtime alone.', type: 'number', min: 0, max: 2, step: 0.05, default: 0.3 },
		],
		presets: [],
		triggers: [{ id: 'play', label: 'Play', hint: 'Casts it again where it was last cast.' }],
	},
	credits: [
		{ files: 'effekseer.min.js', license: 'MIT', source: 'https://github.com/effekseer/EffekseerForWebGL', author: 'Effekseer Project (web runtime 1.80.8)' },
		{ files: 'effekseer.wasm', license: 'MIT', source: 'https://github.com/effekseer/EffekseerForWebGL', author: 'Effekseer Project (web runtime 1.80.8)' },
		{ files: 'effects/', license: 'CC0-1.0', source: 'https://github.com/effekseer/Effekseer', author: `Effekseer's sample effects, by ${authors.join(', ')}` },
		{ files: 'floor/', license: 'CC0-1.0', source: 'https://polyhaven.com/a/monastery_stone_floor', author: 'Amal Kumar (Poly Haven)' },
		{ files: 'sky/', license: 'CC0-1.0', source: 'https://polyhaven.com/a/qwantani_dusk_2_puresky', author: 'Poly Haven' },
		{ files: 'assets/', license: 'MIT', source: 'https://github.com/mrdoob/three.js', author: 'The three.js authors; the demo code is Patch, MIT' },
		{ files: 'assets/red-hat-mono-*.woff2', license: 'OFL-1.1', source: 'https://github.com/RedHatOfficial/RedHatFont', author: 'The Red Hat Project Authors (Red Hat Mono)' },
		...(images ? [{ files: 'thumbs/', license: 'CC0-1.0', source: 'https://github.com/effekseer/Effekseer', author: "Patch (stills of Effekseer's sample effects in this demo)" }] : []),
	],
};
fs.writeFileSync(path.join(here, 'recipe.json'), `${JSON.stringify(recipe, null, '\t')}\n`);
const c = recipe.block.controls;
console.log(`recipe.json: ${c.length} controls (${c.filter((x) => x.essential).length} essential), ${recipe.block.triggers.length} trigger; ${EFFECTS.length} effects in ${GROUPS.length} groups${images ? ', with pictures' : ''}`);
