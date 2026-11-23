---
kind: effect
engine: three
---

# Effekseer effects

33 hand-made magic and sword effects: fire, water, lightning, slashes, heals, shields and hits, played in the browser by Effekseer's web runtime in three.js. Free to use: runtime MIT, effects CC0.

[Effekseer](https://github.com/effekseer/Effekseer) is an open-source particle effect editor and player. These are its free sample effects, made by effect artists in its editor, with a stylised fantasy look: not realistic fire or smoke. In the live demo, pick an effect on the page, by group and from its picture, and click the floor to cast it there. Drag turns the view and the wheel zooms.

## What this owns

- **Renderer:** WebGL, and it takes yours: `createEffectPlayer(renderer, { wasm })` in `src/player.js` works on `renderer.getContext()`.
- **Frame loop:** It doesn't draw the frame. After your `renderer.render(scene, camera)`, call `fx.update(dt)` and `fx.draw(camera)`, which draws into whatever target three has bound, then calls `renderer.resetState()`. The bloom and colour shift are the demo's, in `src/look.js`.
- **three:** `package.json` pins 0.186.1. `src/player.js` imports nothing from three, and the runtime in `vendor/effekseer` is vendored, so no other library has to match.
- **Copy:** `vendor/effekseer/effekseer.min.js`, `vendor/effekseer/effekseer.wasm`, `src/player.js`, and the effects you want from `public/effects/`, keeping each one's relative paths.
- **Elsewhere:** The runtime is a classic script that sets `window.effekseer`, so load it with a plain `<script>` tag before `createEffectPlayer`. FireBall at scale 0.3 is about 7 m, and repeated casts whited out the frame: `w` and `h` in `src/effects.baked.json` give each effect's size at scale 1.

## Use it in a game

Works with three's `WebGLRenderer` only, not the WebGPU one. Copy `vendor/effekseer/effekseer.min.js`, `vendor/effekseer/effekseer.wasm`, `src/player.js` and the effects you want from `public/effects/` into your game. The runtime is a classic script that needs sloppy mode, so load it with a plain script tag, not an import:

```html
<script src="./effekseer.min.js"></script>
```

```js
import { createEffectPlayer } from './player.js';

const fx = await createEffectPlayer(renderer, { wasm: './effekseer.wasm' });
await fx.load('fireball', './effects/pierre-2/FireBall.efk', 0.3); // 0.3 is its size: see below

const cast = fx.play('fireball', x, y, z, { speed: 1, seed: 7 });

function frame(dt) {
  renderer.render(scene, camera);
  fx.update(dt);       // seconds
  fx.draw(camera);     // draws over what three just drew, then leaves three's state clean
}
```

Things that are easy to get wrong, all learned building the demo:

- **Check an effect's size first.** FireBall is about 21 by 25 m at scale 1, so 0.3 is still about 7 m, and repeated casts white out the frame. Each effect's `w` and `h` are in `effects.baked.json`.
- **Scale at load, not at play.** The third argument of `load` is built into the effect. Some parts of an effect ignore `handle.setScale`, so a glow can stay huge while the rest shrinks. To play one effect at two sizes, load it twice. The sizes the effects were made at vary by a factor of 50: `src/effects.baked.json` has each one's width and height at scale 1 (`w`, `h`), and `y0`, how far it goes below its origin.
- **Load before you need it.** `load` uploads textures, so do it during your loading screen, and play each effect once, unseen, to warm it. Effects that load all their files at once are fine in parallel.
- **Load after three's own textures, or reset the unpack flags** (`src/player.js` does this): if three left `UNPACK_FLIP_Y` on, effects' textures come out flipped.
- **Stop what doesn't end.** Check `handle.exists` to see if it's over. Some effects run forever, and a few sword effects run 15 seconds: `active` in `effects.baked.json` is how many frames (at 60 a second) they're worth watching. Then call `handle.stopRoot()`, which lets what's in the air finish.
- **Depth.** `fx.draw` tests against whatever depth buffer is bound, so effects go behind walls. But the soft glows are cut in a hard line where they cross the floor. The demo draws them with no depth buffer, which only works if nothing can stand in front of them.
- **Effects are made for the editor's display colours**, not linear light. Drawn straight onto the canvas after three, they look as made. Drawn into a linear target, they look washed out: `src/look.js` tone maps the scene first, then draws them over that.
- **Distortion** needs `fx.context.captureBackground(0, 0, width, height)` before `draw`, with the picture behind them bound.

The handle can also move, rotate, tint (`setAllColor`, which multiplies) and pause: `vendor/effekseer/effekseer.d.ts` has it all. The bloom, the colour shift, the floor's light and its reflection are this demo's, not the runtime's: `src/look.js`, and `frame()` and `lightFloor()` in `demo.js`. Take them if you want them.

## Add more effects

A game needs an effect exported to a compiled `.efk`, and only Effekseer's editor makes those.

1. Download the [official editor release](https://github.com/effekseer/Effekseer/releases) (Windows, Mac or Linux). Its `Sample` folder has 99 effects, which is where these 33 came from. More are on Effekseer's site; check each one's licence, since only the Sample folder has the CC0 notice.
2. Export from the command line. It doesn't open a window:
   ```bash
   Effekseer -cui -in MagicFire1.efkproj -e MagicFire1.efk
   ```
3. Copy the `.efk` and every file it asks for, keeping their relative paths (`Texture/…`, `Model/…`, `Material/…`), into `public/effects/<pack>/`.
4. Add a line to `src/effects.js`, then run `npm run dev`, `node bake.mjs` and `node make-thumbs.mjs`. Those measure it and take its picture, using the demo itself.

`source/` has the editable project of each effect. To change one, put it beside its `.efk` in `public/effects/<pack>/` so it finds its textures, open it in the editor (or edit its XML: colours, counts and lifetimes are easy), and export it again. Agents can tweak these well, but won't write a good one from nothing: they're 100 KB to 1.6 MB of settings. The samples ship no sound files, so `MagicWater`'s project has its sound nodes turned off, to save two failed requests. Other projects may ask for files that aren't there.

## Controls

The block page talks to the demo over the `patch-block` message channel (`lib/patch-block.js`).

**For people** (the block page shows these):

| id | Control | Type | Range | What it does |
|---|---|---|---|---|
| `effect` | Effect | choice | 33 options in 8 groups, each with a picture; default Golden rise | Which effect plays. Click the floor in the frame to cast it there. |
| `size` | Size | number | 0.4 to 2.5 ×, default 1 | How big it plays. |
| `speed` | Speed | number | 0.2 to 2 ×, default 1 | How fast it plays: 1 is as made. |
| `colour` | Colour | number | 0 to 360 °, default 0 | Turns its colours around the wheel: 0 is as made. |
| `auto` | Keep casting | toggle | default on | Casts it again in the middle whenever it has finished. |

The groups are Fire, Water and ice, Lightning, Sword, Heal and holy, Dark, Shields and Hits. **Trigger:** Play (`play`): casts it again where it was last cast.

**For agents** (one more, in `recipe.json`):

| id | Control | Type | Range | What it does |
|---|---|---|---|---|
| `glow` | Glow | number | 0 to 2, default 0.3 | How much the bright parts bloom: 0 is the runtime alone. |

## Build it

```bash
npm install
npm run build        # recipe.json, then dist/
```

`dist/` is the live demo exactly as released, with `index.html` at the top and nothing loaded from other hosts.

| Path | What |
|---|---|
| `demo.js`, `index.html` | The demo page |
| `src/player.js` | The small wrapper around the runtime, to copy into a game |
| `src/look.js` | The demo's frame: bloom, colour shift, roll-off |
| `src/effects.js`, `src/effects.baked.json` | The list of effects, and what `bake.mjs` measured of each |
| `public/effects/` | The exported effects and their textures, models and materials |
| `source/` | The effects' editable projects |
| `vendor/effekseer/` | Effekseer's web runtime 1.80.8, unedited, its types, its licences and the samples' licence notice |
| `recipe.json`, `make-recipe.mjs` | The release recipe (mode `browser` with its `block` section) |
| `bake.mjs`, `make-thumbs.mjs`, `make-cover.mjs` | Measure the effects, take their pictures and the cover, from the running demo |
| `thumbs/effects/` | The Effect choice's pictures |
| `lib/patch-block.js` | Patch's block demo helper, as served at patch.gg/patch-block.js |

## Credits and licences

Thank you to Effekseer and the effects' authors. `LICENCE-NOTES.md` has every part.

- **Effekseer's web runtime**: Effekseer Project, MIT (`vendor/effekseer/LICENSE`).
- **The effects**: CC0, by Pierre, NextSoft, AndrewFM, Suzuki, tktk and the Effekseer project. The notice that ships with them asks you to credit Effekseer and the contributor if you can, which isn't required.
- **Floor and sky**: Poly Haven, CC0. **three.js**: MIT. **Red Hat Mono**: SIL OFL 1.1.
- **The demo and its wrapper**: Patch, MIT.

Code: MIT (`LICENSE`). Art: CC0.
