// Effekseer's block demo: its free effects played by its web runtime (vendor/effekseer, MIT) in three.js, on a stone floor
// at dusk, steered by Patch's block page through Patch's block demo helper (lib/patch-block.js). The controls are in
// recipe.json (make-recipe.mjs).
//
// In the frame: a click casts the chosen effect on the floor, a drag turns the view and the wheel zooms. The effects
// light the floor and shine in it (src/look.js): both are this demo's, not the runtime's. Everything is loaded and
// played once before ready, with the canvas hidden, so no effect hitches the first time it plays.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { patchBlock } from 'patch-block';
import { block as recipeBlock } from './recipe.json';
import { EFFECTS, GROUPS } from './src/effects.js';
import baked from './src/effects.baked.json';
import { createEffectPlayer } from './src/player.js';
import { Look, rotateHueRGB } from './src/look.js';

const canvas = document.getElementById('view');
const FLOOR_R = 24; // how far from the middle a click can cast
const MAX_CASTS = 10;
const LIGHTS = 6;
const SEED = 7;
const BAKING = location.search.includes('bake'); // bake.mjs measures them all at the size they were made

// The moment to show in a picture: its best one, but while it still plays here.
const atOf = (b, e) => { const end = (e.life ?? Math.min(9, (b.active ?? 300) / 60 + 0.2)) * 60; return (b.at ?? 40) <= end ? b.at ?? 40 : Math.round(end * 0.55); };
const spec = Object.fromEntries(
	EFFECTS.map((e) => {
		const b = baked[e.id] ?? {};
		const across = Math.max(b.w ?? 8.5, (b.h ?? 8.5) * 0.9, 0.01);
		const scale = BAKING ? 1 : (e.size ?? 7.5) / across;
		const lift = e.lift ?? Math.max(0, -(b.y0 ?? 0) * scale);
		const top = lift + (b.y1 ?? 4) * scale;
		return [e.id, { ...e, scale, lift, life: e.life ?? Math.min(9, (b.active ?? 300) / 60 + 0.2), rgb: b.rgb ?? [1, 0.9, 0.8], curve: b.curve ?? [1], power: (b.power ?? 0.3) * (e.glowLight ?? 1), at: e.at ?? atOf(b, e), height: top, top, pace: e.pace ?? 1 }];
	}),
);

let visible = true;
// 한국어판: 조작값 적용을 한 함수로 모았다. Patch 블록 메시지와 단독 배포용 패널이 모두 이 함수를 쓴다.
function applyControl(id, value) {
	v[id] = value;
	if (id === 'effect') return chose(value);
	if (id === 'size') {
		for (const c of casts) {
			c.handle.setScale(value, value, value);
			c.handle.setLocation(c.x, c.spec.lift * value, c.z);
		}
	}
	if (id === 'speed') for (const c of casts) c.handle.setSpeed(value * c.spec.pace);
	if (id === 'auto' && value) nextAuto = 0;
}

const block = patchBlock({
	...recipeBlock,
	onSet: applyControl,
	onTrigger(id) {
		if (id === 'play') cast(v.effect, lastSpot.x, lastSpot.z);
	},
	onVisible(on) {
		visible = on;
		last = performance.now();
	},
});
// Every control's current value: onSet keeps it in step with the helper's.
const v = block.values;

// --- Scene
let renderer;
try {
	renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
} catch {
	document.getElementById('nogpu').classList.add('on');
	throw new Error('This demo needs WebGL 2.');
}
renderer.toneMapping = THREE.NoToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
const look = new Look(renderer);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.3, 900);
camera.position.set(0, 7.2, 19);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 2.9, 0);
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 7;
controls.maxDistance = 40;
controls.minPolarAngle = 0.5;
controls.maxPolarAngle = 1.5;
controls.update();

const reflectU = { uRefl: { value: null }, uRes: { value: new THREE.Vector2(1, 1) } };

async function buildWorld() {
	const texLoader = new THREE.TextureLoader();
	const [diff, nor, arm, sky] = await Promise.all([
		texLoader.loadAsync('./floor/diff.webp'),
		texLoader.loadAsync('./floor/nor.webp'),
		texLoader.loadAsync('./floor/arm.webp'),
		new HDRLoader().loadAsync('./sky/qwantani_dusk_2_puresky_1k.hdr'),
	]);
	sky.mapping = THREE.EquirectangularReflectionMapping;
	const pmrem = new THREE.PMREMGenerator(renderer);
	scene.environment = pmrem.fromEquirectangular(sky).texture;
	pmrem.dispose();
	scene.environmentIntensity = 0.16;
	scene.background = sky;
	scene.backgroundIntensity = 0.13;
	scene.fog = new THREE.FogExp2(new THREE.Color(0.075, 0.058, 0.082), 0.02);

	const aniso = renderer.capabilities.getMaxAnisotropy();
	const REPEAT = 300 / 3.6; // the stones are 1.8 m to a tile in the source: a little bigger reads better from this far
	for (const t of [diff, nor, arm]) {
		t.wrapS = t.wrapT = THREE.RepeatWrapping;
		t.repeat.set(REPEAT, REPEAT);
		t.anisotropy = aniso;
	}
	diff.colorSpace = THREE.SRGBColorSpace;
	const floorMat = new THREE.MeshStandardMaterial({ map: diff, normalMap: nor, roughnessMap: arm, aoMap: arm, aoMapIntensity: 1, roughness: 0.92, metalness: 0 });
	floorMat.normalScale.set(1.1, 1.1);
	floorMat.onBeforeCompile = (shader) => {
		Object.assign(shader.uniforms, reflectU);
		shader.fragmentShader = shader.fragmentShader
			.replace('#include <common>', '#include <common>\nuniform sampler2D uRefl; uniform vec2 uRes;')
			// Large, slow changes of colour and wetness, so the tile doesn't read as a tile.
			.replace(
				'#include <map_fragment>',
				`#include <map_fragment>
				float patchy = texture2D(map, vMapUv * 0.067).g * 0.6 + texture2D(map, vMapUv * 0.021 + 0.3).g * 0.8;
				diffuseColor.rgb *= mix(0.62, 1.12, smoothstep(0.1, 0.62, patchy));`,
			)
			.replace(
				'#include <roughnessmap_fragment>',
				`#include <roughnessmap_fragment>
				roughnessFactor = clamp(roughnessFactor * mix(0.5, 1.0, smoothstep(0.12, 0.5, patchy)), 0.04, 1.0);`,
			)
			// The effects shine in the stone: their mirrored view, softened, wherever the stone is smooth or seen low down.
			.replace(
				'#include <opaque_fragment>',
				`{
					vec3 toEye = normalize(vViewPosition);
					float fres = pow(1.0 - saturate(dot(normal, toEye)), 4.0);
					vec2 ruv = gl_FragCoord.xy / uRes + (normal.xy - vec2(0.0, normal.z * 0.0)) * vec2(0.035, 0.09);
					vec3 shine = texture2D(uRefl, ruv).rgb;
					shine = pow(1.0 - exp(-max(shine, vec3(0.0)) * 1.1), vec3(2.2));
					outgoingLight += shine * (0.12 + 1.1 * fres) * (1.2 - roughnessFactor);
				}
				#include <opaque_fragment>`,
			);
	};
	floorMat.customProgramCacheKey = () => 'effekseer-floor';
	const floor = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), floorMat);
	floor.rotation.x = -Math.PI / 2;
	scene.add(floor);

	// The last of the sun, low and warm, to show the stones' relief.
	const sun = new THREE.DirectionalLight(0xffa77a, 0.32);
	sun.position.set(-30, 7, -22);
	scene.add(sun);
}

// Standing stones far back, dark against the sky: something to give the floor a size. Inside their ring, an effect
// can't be behind one from the camera, which is why the effects don't need the depth buffer.
function addStones() {
	const mat = new THREE.MeshStandardMaterial({ color: 0x24262b, roughness: 0.95 });
	const geo = new THREE.BoxGeometry(1, 1, 1, 2, 6, 2);
	const pos = geo.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		const y = pos.getY(i) + 0.5;
		const taper = 1 - y * 0.32;
		pos.setXYZ(i, pos.getX(i) * taper + Math.sin(i * 12.9) * 0.05, pos.getY(i) + Math.sin(i * 7.3) * 0.03, pos.getZ(i) * taper + Math.cos(i * 4.1) * 0.05);
	}
	geo.computeVertexNormals();
	const N = 15;
	const stones = new THREE.InstancedMesh(geo, mat, N);
	const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
	for (let i = 0; i < N; i++) {
		const a = (i / N) * Math.PI * 2 + Math.sin(i * 3.1) * 0.08;
		const R = 54 + Math.sin(i * 5.7) * 3;
		const h = 7 + ((i * 7) % 5) * 1.5;
		e.set(Math.sin(i * 2.3) * 0.05, a + i, Math.cos(i * 1.7) * 0.05);
		q.setFromEuler(e);
		m.compose(new THREE.Vector3(Math.cos(a) * R, h / 2 - 0.2, Math.sin(a) * R), q, new THREE.Vector3(2.4 + (i % 3) * 0.5, h, 1.7));
		stones.setMatrixAt(i, m);
	}
	scene.add(stones);
}

// --- Effects and their lights
let player;
const casts = [];
const lights = [];
const mirrorView = new THREE.Matrix4();
const FLIP_Y = new THREE.Matrix4().makeScale(1, -1, 1);
const lastSpot = new THREE.Vector3();
let nextAuto = 0;
let clock = 0;
let seed = SEED;

function addLights() {
	for (let i = 0; i < LIGHTS; i++) {
		const l = new THREE.PointLight(0xffffff, 0, 34, 1.7);
		l.position.set(0, -50, 0);
		scene.add(l);
		lights.push({ light: l, cast: null });
	}
}

function cast(id, x, z, { fixedSeed } = {}) {
	const s = spec[id];
	if (!s || !player) return null;
	if (casts.length >= MAX_CASTS) endCast(casts[0]);
	const handle = player.play(id, x, s.lift * v.size, z, { scale: v.size, speed: v.speed * s.pace, seed: fixedSeed ?? seed++ });
	const c = { handle, spec: s, x, z, frames: 0, stopped: false, light: null };
	const free = lights.find((l) => !l.cast) ?? lights[0];
	free.cast = c;
	c.light = free;
	casts.push(c);
	lastSpot.set(x, 0, z);
	return c;
}
function endCast(c) {
	c.handle.stop();
	dropCast(c);
}
function dropCast(c) {
	casts.splice(casts.indexOf(c), 1);
	if (c.light?.cast === c) {
		c.light.cast = null;
		c.light.light.intensity = 0;
	}
}

function chose(id) {
	const nameEl = document.getElementById('name');
	nameEl.textContent = spec[id].label;
	for (const c of [...casts]) endCast(c);
	if (started) {
		cast(id, 0, 0);
		nextAuto = clock + 0.6;
		pulseLabel();
	}
}
function pulseLabel() {
	const el = document.getElementById('label');
	el.classList.add('hit');
	setTimeout(() => el.classList.remove('hit'), 140);
}

function stepCasts(dt) {
	const frames = dt * 60;
	player.update(dt);
	for (const c of [...casts]) {
		c.frames += frames * v.speed * c.spec.pace;
		const life = c.spec.life * 60;
		if (!c.stopped && c.frames > life) {
			c.stopped = true;
			c.handle.stopRoot();
		}
		if (!c.handle.exists || c.frames > life + 240) {
			if (c.handle.exists) c.handle.stop();
			dropCast(c);
		}
	}
}

function lightFloor() {
	const hue = v.colour;
	for (const l of lights) {
		const c = l.cast;
		if (!c) continue;
		const curve = c.spec.curve;
		const i = Math.min(curve.length - 1, Math.max(0, c.frames / 6));
		const a = curve[Math.floor(i)] ?? 0, b = curve[Math.ceil(i)] ?? a;
		const amount = Math.pow(a + (b - a) * (i - Math.floor(i)), 1.6) * (c.frames > c.spec.life * 60 ? 0.5 : 1);
		const [r, g, bl] = hue ? rotateHueRGB(c.spec.rgb, hue) : c.spec.rgb;
		l.light.color.setRGB(r, g, bl);
		l.light.intensity = Math.min(200, 120 * c.spec.power * amount * v.size * v.size);
		l.light.position.set(c.x, 1.2 + Math.min(c.spec.height, 8) * 0.28 * v.size, c.z);
	}
}

// --- The frame
const size = new THREE.Vector2();
function frame(dt) {
	stepCasts(dt);
	lightFloor();
	renderer.getDrawingBufferSize(size);
	look.setSize(size.x, size.y);
	reflectU.uRes.value.copy(size);
	reflectU.uRefl.value = look.mirrorSoft.texture;
	camera.updateMatrixWorld();

	// The effects as the floor would mirror them.
	look.clear(look.mirror);
	mirrorView.multiplyMatrices(camera.matrixWorldInverse, FLIP_Y);
	player.draw(camera, mirrorView);
	look.softenMirror();

	// The world.
	renderer.setRenderTarget(look.scene);
	renderer.setClearColor(0x000000, 1);
	renderer.render(scene, camera);
	look.toneMap();

	// The effects, over what's behind them.
	renderer.setRenderTarget(look.display);
	player.context.captureBackground(0, 0, size.x, size.y);
	look.seedEffects();
	player.draw(camera);

	look.bloom();
	look.present(v.glow, (v.colour * Math.PI) / 180);
}

let last = performance.now();
let started = false;
function loop(now) {
	requestAnimationFrame(loop);
	const dt = Math.min(0.05, (now - last) / 1000);
	last = now;
	if (!visible) return;
	clock += dt;
	controls.update();
	if (v.auto && casts.length === 0 && clock > nextAuto) {
		cast(v.effect, 0, 0);
		nextAuto = clock + 0.5;
	}
	frame(dt);
}

function resize() {
	renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
	renderer.setSize(innerWidth, innerHeight, false);
	camera.aspect = innerWidth / Math.max(1, innerHeight);
	camera.updateProjectionMatrix();
}

// --- Clicks: a click that didn't turn into a drag casts on the floor.
const ray = new THREE.Raycaster();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hit = new THREE.Vector3();
const ndc = new THREE.Vector2();
function floorPoint(e) {
	const r = canvas.getBoundingClientRect();
	ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
	ray.setFromCamera(ndc, camera);
	if (!ray.ray.intersectPlane(floorPlane, hit)) return null;
	const d = Math.hypot(hit.x, hit.z);
	if (d > FLOOR_R) hit.multiplyScalar(FLOOR_R / d);
	return hit;
}
let down = null;
canvas.addEventListener('pointerdown', (e) => {
	if (e.button === 0) down = { x: e.clientX, y: e.clientY, t: performance.now() };
});
addEventListener('pointerup', (e) => {
	if (!down) return;
	const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
	down = null;
	if (moved > 6) return;
	const p = floorPoint(e);
	if (!p) return;
	cast(v.effect, p.x, p.z);
	nextAuto = clock + 6;
	pulseLabel();
});

// --- Warm-up: everything loaded, every effect played once through the whole frame, before anyone sees a thing.
const pool = async (items, n, fn) => {
	const q = [...items];
	await Promise.all(Array.from({ length: n }, async () => {
		while (q.length) await fn(q.shift());
	}));
};
const breathe = () => new Promise((r) => setTimeout(r, 0));

async function warmUp() {
	resize();
	await buildWorld();
	addStones();
	addLights();
	player = await createEffectPlayer(renderer);
	await pool(EFFECTS, 6, (e) => player.load(e.id, `./effects/${e.file}`, spec[e.id].scale));
	// The whole frame once, so its programs exist, with the lights in use.
	renderer.getDrawingBufferSize(size);
	look.setSize(size.x, size.y);
	reflectU.uRes.value.copy(size);
	reflectU.uRefl.value = look.mirrorSoft.texture;
	await renderer.compileAsync(scene, camera);
	frame(1 / 60);
	await breathe();
	// Each effect through its first three seconds in small steps, not jumps: what it spawns, it spawns in the same way.
	const play = (seconds) => {
		for (let f = 0; f < seconds * 60 && casts.length; f += 4) {
			stepCasts(4 / 60);
			renderer.setRenderTarget(look.fx);
			player.draw(camera);
		}
	};
	for (const e of EFFECTS) {
		cast(e.id, 0, 0, { fixedSeed: SEED });
		play(0.7);
		if (casts.length) frame(1 / 60);
		play(2.3);
		for (const c of [...casts]) endCast(c);
		await breathe();
	}
	// Then the heaviest ones together, which grows the runtime's memory to what a busy moment needs: growing it later stalls.
	for (const id of ['blood-lance', 'phantasm-rain', 'flame-ring', 'sacred-blade', 'moonlight-blade', 'blood-lance', 'phantasm-rain', 'fireball', 'storm-orb', 'golden-cuts']) cast(id, 0, 0, { fixedSeed: SEED });
	play(2.5);
	frame(1 / 60);
	for (const c of [...casts]) endCast(c);
	player.context.stopAll();
	player.update(2 / 60);
	await breathe();
}

addEventListener('resize', resize);
document.getElementById('name').textContent = spec[v.effect].label;
await warmUp();
last = performance.now();
started = true;
clock = 0;
// The first cast already under way in the hidden canvas, a frame or two of it settled, then show it.
if (!BAKING) {
	cast(v.effect, 0, 0, { fixedSeed: SEED });
	for (let i = 0; i < 15; i++) stepCasts(3 / 60); // small steps: a big one can skip what an effect spawns
}
frame(1 / 60);
await new Promise(requestAnimationFrame);
frame(1 / 60);
await new Promise(requestAnimationFrame);
last = performance.now();
canvas.style.visibility = 'visible';
document.body.classList.add('on');
requestAnimationFrame(loop);
// The browser's first draw of a canvas that was hidden can take a while: that's over before we say ready.
for (let i = 0; i < 12; i++) await new Promise(requestAnimationFrame);
block.ready();

window.__block = {
	values: v,
	spec,
	get casts() { return casts.length; },
	/** For make-thumbs.mjs and make-cover.mjs: plays an effect from the start to one frame and holds it there. */
	seek(id, at, { x = 0, z = 0, again = false } = {}) {
		if (!again) for (const c of [...casts]) endCast(c);
		visible = false;
		const c = cast(id, x, z, { fixedSeed: SEED });
		const step = 3;
		for (let f = 0; f < at; f += step * c.spec.pace) stepCasts(step / 60);
		return c;
	},
	shot() {
		frameStill();
	},
	view(px, py, pz, tx, ty, tz) {
		camera.position.set(px, py, pz);
		controls.target.set(tx, ty, tz);
		controls.update();
	},
	/** For bake.mjs: how big an effect is at scale 1, how long it lasts, and how it lights things. Measured side on. */
	measure,
};
function frameStill() {
	lightFloor();
	const dtZero = 1e-4;
	frame(dtZero);
}

async function measure(id) {
	const S = 256;
	const rt = new THREE.WebGLRenderTarget(S, S, { type: THREE.UnsignedByteType, depthBuffer: false });
	const px = new Uint8Array(S * S * 4);
	visible = false;
	for (const c of [...casts]) endCast(c);
	const run = (w, cx, cy, step, cap, each) => {
		const cam = new THREE.OrthographicCamera(-w / 2, w / 2, w / 2, -w / 2, -1000, 1000);
		cam.position.set(cx, cy, 0);
		cam.updateMatrixWorld();
		cam.updateProjectionMatrix();
		const h = player.play(id, 0, 0, 0, { seed: SEED });
		let f = 0;
		let ended = false;
		while (f < cap) {
			player.update(step / 60);
			f += step;
			renderer.setRenderTarget(rt);
			renderer.setClearColor(0, 0);
			renderer.clear(true, false, false);
			player.draw(cam);
			renderer.setRenderTarget(rt);
			renderer.readRenderTargetPixels(rt, 0, 0, S, S, px);
			each(f, px, w, cx, cy);
			if (!h.exists) { ended = true; break; }
		}
		player.context.stopAll();
		player.update(1 / 60);
		player.update(1 / 60);
		return { f, ended };
	};
	let cx = 0, cy = 0, w = 80;
	let box = null;
	const scan = (f, p, width, ox, oy) => {
		for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
			const i = (y * S + x) * 4;
			if (p[i] + p[i + 1] + p[i + 2] < 300) continue;
			const wx = ox + ((x + 0.5) / S - 0.5) * width, wy = oy + ((y + 0.5) / S - 0.5) * width;
			if (!box) box = { x0: wx, x1: wx, y0: wy, y1: wy };
			box.x0 = Math.min(box.x0, wx); box.x1 = Math.max(box.x1, wx);
			box.y0 = Math.min(box.y0, wy); box.y1 = Math.max(box.y1, wy);
		}
	};
	let kept = null;
	for (let pass = 0; pass < 4; pass++) {
		box = null;
		run(w, cx, cy, 6, 480, scan);
		await breathe();
		if (!box) {
			// Too small to see from this far, or too faint: closer, keeping what the last pass saw.
			if (kept) break;
			w /= 4;
			continue;
		}
		const big = Math.max(box.x1 - box.x0, box.y1 - box.y0);
		const pixel = w / S;
		if (big > w * 0.95) {
			w *= 3;
			continue;
		}
		kept = box;
		cx = (box.x0 + box.x1) / 2;
		cy = (box.y0 + box.y1) / 2;
		w = Math.max(big, pixel * 2) * 1.25;
	}
	box = kept ?? box;
	// The last pass: its timeline at this framing.
	const curve = [];
	let rgb = [0, 0, 0], best = { score: -1, f: 30 };
	const { f: lastF, ended } = run(w, cx, cy, 6, 1800, (f, p) => {
		let sum = 0, n = 0, white = 0;
		const c = [0, 0, 0];
		for (let i = 0; i < p.length; i += 4 * 3) {
			const l = p[i] + p[i + 1] + p[i + 2];
			c[0] += p[i]; c[1] += p[i + 1]; c[2] += p[i + 2];
			sum += l;
			if (l > 180) n++;
			if (l > 720) white++;
		}
		curve.push(sum);
		rgb = rgb.map((x, k) => x + c[k]);
		const score = n * (1 - Math.min(0.85, (white / Math.max(1, n)) * 1.2));
		if (score > best.score) best = { score, f };
	});
	await breathe();
	rt.dispose();
	const peak = Math.max(1, ...curve);
	const top = Math.max(...rgb, 1);
	return {
		w: box ? box.x1 - box.x0 : 1,
		h: box ? box.y1 - box.y0 : 1,
		y0: box?.y0 ?? 0,
		y1: box?.y1 ?? 1,
		life: lastF,
		ended,
		at: best.f,
		rgb: rgb.map((x) => Number((x / top).toFixed(3))),
		power: Number(Math.min(1.5, (peak / ((S * S) / 3) / 255 / 3) * 4).toFixed(3)),
		active: (curve.findLastIndex((x) => x > peak * 0.06) + 1) * 6,
		curve: curve.slice(0, 200).map((x) => Number((x / peak).toFixed(2))),
	};
}


// --- 한국어판: 단독 배포(GitHub Pages)용 조작 패널. 원작은 patch.gg의 블록 페이지가 이 조작 UI를 제공하므로,
// Patch 블록으로 임베드됐을 때는 이 패널을 만들지 않는다.
function buildPanel() {
	if (window.parent !== window) return;
	const panel = document.getElementById('panel');
	if (!panel) return;
	const groupsEl = document.createElement('div');
	groupsEl.className = 'groups';
	const effectsEl = document.createElement('div');
	effectsEl.className = 'effects';
	const rowsEl = document.createElement('div');
	rowsEl.className = 'rows';
	const footEl = document.createElement('div');
	footEl.className = 'foot';
	footEl.textContent = '클릭: 바닥에 시전 · 드래그: 시점 회전 · 휠: 확대/축소 — Effekseer, MIT · 이펙트 CC0';
	panel.append(groupsEl, effectsEl, rowsEl, footEl);

	const effectButtons = new Map();
	function markEffect() {
		for (const [id, b] of effectButtons) b.classList.toggle('on', id === v.effect);
	}
	function renderEffects(group) {
		effectsEl.textContent = '';
		effectButtons.clear();
		for (const e of EFFECTS.filter((x) => x.group === group)) {
			const b = document.createElement('button');
			const img = document.createElement('img');
			img.src = `thumbs/effects/${e.id}.webp`;
			img.alt = e.label;
			img.loading = 'lazy';
			const t = document.createElement('div');
			t.textContent = e.label;
			b.append(img, t);
			b.addEventListener('click', () => {
				applyControl('effect', e.id);
				block.state({ effect: e.id });
				markEffect();
			});
			effectsEl.append(b);
			effectButtons.set(e.id, b);
		}
		markEffect();
	}
	for (const g of GROUPS) {
		const b = document.createElement('button');
		b.textContent = g;
		b.addEventListener('click', () => {
			for (const x of groupsEl.children) x.classList.toggle('on', x === b);
			renderEffects(g);
		});
		groupsEl.append(b);
	}

	function slider(id, label, min, max, step, unit) {
		const lab = document.createElement('label');
		const name = document.createElement('span');
		name.textContent = label;
		const input = document.createElement('input');
		input.type = 'range';
		input.min = min;
		input.max = max;
		input.step = step;
		input.value = v[id];
		const val = document.createElement('span');
		val.className = 'val';
		val.textContent = `${v[id]}${unit}`;
		input.addEventListener('input', () => {
			const num = Number(input.value);
			applyControl(id, num);
			block.state({ [id]: num });
			val.textContent = `${num}${unit}`;
		});
		lab.append(name, input, val);
		rowsEl.append(lab);
	}
	slider('size', '크기', 0.4, 2.5, 0.05, '×');
	slider('speed', '속도', 0.2, 2, 0.05, '×');
	slider('colour', '색상', 0, 360, 5, '°');

	const autoLab = document.createElement('label');
	const autoBox = document.createElement('input');
	autoBox.type = 'checkbox';
	autoBox.checked = !!v.auto;
	autoBox.addEventListener('change', () => {
		applyControl('auto', autoBox.checked);
		block.state({ auto: autoBox.checked });
	});
	autoLab.append(autoBox, document.createTextNode(' 자동 반복'));
	rowsEl.append(autoLab);

	const replay = document.createElement('button');
	replay.className = 'replay';
	replay.textContent = '다시 시전';
	replay.addEventListener('click', () => cast(v.effect, lastSpot.x, lastSpot.z));
	rowsEl.append(replay);

	// 처음에는 기본 이펙트가 속한 그룹을 연다.
	const firstGroup = EFFECTS.find((e) => e.id === v.effect)?.group ?? GROUPS[0];
	for (const x of groupsEl.children) x.classList.toggle('on', x.textContent === firstGroup);
	renderEffects(firstGroup);
}
buildPanel();
