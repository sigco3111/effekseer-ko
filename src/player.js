// A small three.js wrapper around Effekseer's web runtime (vendor/effekseer, a classic script that sets
// window.effekseer; load it with a plain <script> tag before this module). Works with three's WebGLRenderer only.
//
//   const player = await createEffectPlayer(renderer, { wasm: './effekseer.wasm' });
//   await player.load('fireball', './effects/pierre-2/FireBall.efk');
//   const cast = player.play('fireball', x, y, z, { scale: 0.4, speed: 1 });
//   // each frame, after three has drawn the scene:
//   player.update(dtSeconds);
//   player.draw(camera);
//
// draw() draws into whatever target three has bound, and leaves three's state clean.
export async function createEffectPlayer(renderer, { wasm = './effekseer.wasm', instances = 16000, squares = 48000 } = {}) {
	const gl = renderer.getContext();
	const runtime = window.effekseer;
	await new Promise((resolve, reject) => runtime.initRuntime(wasm, resolve, () => reject(new Error(`Effekseer's runtime did not load from ${wasm}`))));
	const context = runtime.createContext();
	context.init(gl, { instanceMaxCount: instances, squareMaxCount: squares });
	const effects = new Map();

	return {
		context,
		effects,
		/** Loads an effect and every file it asks for; call it before you need the effect, it uploads textures. `scale` is built
		 * in at load: use it for the size you want, since some parts of an effect ignore the scale given to play(). */
		load(id, url, scale = 1) {
			// three may have left these on for its own textures, and they'd flip Effekseer's.
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
			gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
			gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
			return new Promise((resolve, reject) => {
				const effect = context.loadEffect(url, scale, () => {
					effects.set(id, effect);
					resolve(effect);
				}, (why, path) => reject(new Error(`${url}: ${why}: ${path}`)));
			});
		},
		/** Plays a loaded effect. The handle can move, scale, tint, slow down and stop it (vendor/effekseer/effekseer.d.ts). */
		play(id, x, y, z, { scale = 1, speed = 1, seed } = {}) {
			const handle = context.play(effects.get(id), x, y, z);
			if (seed !== undefined) handle.setRandomSeed(seed);
			if (scale !== 1) handle.setScale(scale, scale, scale);
			if (speed !== 1) handle.setSpeed(speed);
			return handle;
		},
		/** Moves every playing effect on. Effekseer counts in frames at 60 a second. */
		update(seconds) {
			context.update(seconds * 60);
		},
		/** Draws every playing effect with this camera. `viewMatrix` overrides the camera's (the demo's mirrored view). */
		draw(camera, viewMatrix = camera.matrixWorldInverse) {
			context.setProjectionMatrix(camera.projectionMatrix.elements);
			context.setCameraMatrix(viewMatrix.elements);
			gl.useProgram(null); // the runtime restores the current program, which three may have deleted
			context.draw();
			renderer.resetState();
		},
		stopAll() {
			context.stopAll();
		},
	};
}
