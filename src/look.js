// The demo's frame: the scene lit and tone mapped as usual, then the effects drawn over a copy of it, which is what lets
// them glow and change colour, and blend the way they were made to.
//
//   scene, in linear HDR, to the scene target, then tone mapped to the display target (display colours, 8 bits)
//   a copy of that to the fx target (no depth, half float), and the effects over it. Their colours are display colours,
//   as in Effekseer's editor; added light can go past 1, which is what the bloom picks up. Depth isn't used, so a glow
//   that crosses the floor isn't cut by it.
//   final: the display target + what the effects changed + bloom, with the colour shift and a soft roll-off, to the canvas.
//
// Don't composite the effects as a layer from black using its alpha: many additive sprites have opaque black textures,
// and they come out as dark squares. Effects that distort read what's behind them from captureBackground, the display target.
import * as THREE from 'three';

const fullscreenVS = /* glsl */ `precision highp float;
in vec3 position; out vec2 uv0;
void main() { uv0 = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const toneFS = /* glsl */ `precision highp float;
uniform sampler2D src; uniform float exposure; in vec2 uv0; out vec4 o;
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
void main() { o = vec4(toSRGB(aces(texture(src, uv0).rgb * exposure)), 1.0); }`;

const downFS = /* glsl */ `precision highp float;
uniform sampler2D src; uniform vec2 px; uniform float threshold; in vec2 uv0; out vec4 o;
void main() {
	vec3 c = texture(src, uv0).rgb * 4.0;
	c += texture(src, uv0 + px * vec2(-1.0, -1.0)).rgb + texture(src, uv0 + px * vec2(1.0, -1.0)).rgb;
	c += texture(src, uv0 + px * vec2(-1.0, 1.0)).rgb + texture(src, uv0 + px * vec2(1.0, 1.0)).rgb;
	c /= 8.0;
	if (threshold > 0.0) {
		float b = max(c.r, max(c.g, c.b));
		c *= smoothstep(threshold * 0.55, threshold * 1.25, b);
		c = min(c, vec3(2.0));
	}
	o = vec4(c, 1.0);
}`;

const upFS = /* glsl */ `precision highp float;
uniform sampler2D src; uniform vec2 px; in vec2 uv0; out vec4 o;
void main() {
	vec3 c = texture(src, uv0 + px * vec2(-2.0, 0.0)).rgb + texture(src, uv0 + px * vec2(2.0, 0.0)).rgb;
	c += texture(src, uv0 + px * vec2(0.0, -2.0)).rgb + texture(src, uv0 + px * vec2(0.0, 2.0)).rgb;
	c += (texture(src, uv0 + px * vec2(-1.0, 1.0)).rgb + texture(src, uv0 + px * vec2(1.0, 1.0)).rgb) * 2.0;
	c += (texture(src, uv0 + px * vec2(-1.0, -1.0)).rgb + texture(src, uv0 + px * vec2(1.0, -1.0)).rgb) * 2.0;
	o = vec4(c / 12.0, 1.0);
}`;

const finalFS = /* glsl */ `precision highp float;
uniform sampler2D base, fx, bloom; uniform float glow, hue; uniform vec2 res; in vec2 uv0; out vec4 o;
vec3 rotateHue(vec3 c, float a) {
	const vec3 k = vec3(0.57735);
	float s = sin(a), co = cos(a);
	return c * co + cross(k, c) * s + k * dot(k, c) * (1.0 - co);
}
float noise(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
void main() {
	vec3 b = texture(base, uv0).rgb;
	// What the effects changed, and the bloom of the bright parts, turned around the wheel. The floor keeps its colours.
	vec3 change = texture(fx, uv0).rgb - b + texture(bloom, uv0).rgb * glow;
	if (hue != 0.0) change = rotateHue(change, hue);
	// Roll off each channel: piled-up light runs through its colours to white, as a fire does, and only its heart gets there.
	vec3 c = 1.0 - exp(-max(b * 0.8 + change, vec3(0.0)) * 1.25);
	float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
	c = max(mix(vec3(l), c, 1.18), vec3(0.0));
	o = vec4(c + (noise(gl_FragCoord.xy) - 0.5) / 255.0, 1.0);
}`;

function pass(fragmentShader, uniforms) {
	return new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: fullscreenVS, fragmentShader, uniforms, depthTest: false, depthWrite: false, toneMapped: false });
}
function target(w, h, opts = {}) {
	return new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, ...opts });
}
const LEVELS = 5;

export class Look {
	constructor(renderer) {
		this.renderer = renderer;
		this.quadCam = new THREE.Camera();
		this.quad = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3)));
		this.quad.frustumCulled = false;
		this.quadScene = new THREE.Scene();
		this.quadScene.add(this.quad);
		this.tone = pass(toneFS, { src: { value: null }, exposure: { value: 1 } });
		this.down = pass(downFS, { src: { value: null }, px: { value: new THREE.Vector2() }, threshold: { value: 0 } });
		this.up = pass(upFS, { src: { value: null }, px: { value: new THREE.Vector2() } });
		this.up.blending = THREE.CustomBlending;
		this.up.blendSrc = THREE.OneFactor;
		this.up.blendDst = THREE.OneFactor;
		this.up.transparent = true;
		this.final = pass(finalFS, { base: { value: null }, fx: { value: null }, bloom: { value: null }, glow: { value: 0.9 }, hue: { value: 0 }, res: { value: new THREE.Vector2() } });
		this.w = 0;
		this.h = 0;
	}

	setSize(w, h) {
		if (w === this.w && h === this.h) return;
		this.w = w;
		this.h = h;
		for (const t of [this.scene, this.display, this.fx, this.mirror, this.mirrorSoft, ...(this.chain ?? [])]) t?.dispose();
		this.scene = target(w, h, { depthBuffer: true, samples: 4 });
		this.display = target(w, h, { type: THREE.UnsignedByteType });
		this.fx = target(w, h);
		const qw = Math.ceil(w / 4), qh = Math.ceil(h / 4);
		this.mirror = target(qw, qh);
		this.mirrorSoft = target(Math.ceil(qw / 2), Math.ceil(qh / 2));
		this.chain = [];
		for (let i = 1; i <= LEVELS; i++) this.chain.push(target(Math.ceil(w / 2 ** i), Math.ceil(h / 2 ** i)));
		this.final.uniforms.res.value.set(w, h);
	}

	blit(material, dst) {
		this.quad.material = material;
		this.renderer.setRenderTarget(dst);
		this.renderer.render(this.quadScene, this.quadCam);
	}

	clear(dst) {
		this.renderer.setRenderTarget(dst);
		this.renderer.setClearColor(0x000000, 0);
		this.renderer.clear(true, false, false);
	}

	/** Softens the mirrored effects for the floor. */
	softenMirror() {
		const m = this.down;
		m.uniforms.src.value = this.mirror.texture;
		m.uniforms.px.value.set(1.5 / this.mirror.width, 1.5 / this.mirror.height);
		m.uniforms.threshold.value = 0;
		this.blit(m, this.mirrorSoft);
	}

	toneMap() {
		this.tone.uniforms.src.value = this.scene.texture;
		this.blit(this.tone, this.display);
	}

	/** Starts the effects' target from the finished scene. */
	seedEffects() {
		const m = this.down;
		m.uniforms.src.value = this.display.texture;
		m.uniforms.px.value.set(0, 0);
		m.uniforms.threshold.value = 0;
		this.blit(m, this.fx);
	}

	bloom() {
		const m = this.down;
		let src = this.fx;
		this.chain.forEach((dst, i) => {
			m.uniforms.src.value = src.texture;
			m.uniforms.px.value.set(1 / src.width, 1 / src.height);
			m.uniforms.threshold.value = i === 0 ? 1.05 : 0;
			this.blit(m, dst);
			src = dst;
		});
		const u = this.up;
		for (let i = this.chain.length - 1; i > 0; i--) {
			const from = this.chain[i], to = this.chain[i - 1];
			u.uniforms.src.value = from.texture;
			u.uniforms.px.value.set(0.5 / from.width, 0.5 / from.height);
			this.renderer.autoClear = false;
			this.blit(u, to);
			this.renderer.autoClear = true;
		}
	}

	present(glow, hue) {
		const f = this.final.uniforms;
		f.base.value = this.display.texture;
		f.fx.value = this.fx.texture;
		f.bloom.value = this.chain[0].texture;
		f.glow.value = glow;
		f.hue.value = hue;
		this.blit(this.final, null);
	}
}

/** Lights a colour the way the final pass shifts it, for the floor's lights. */
export function rotateHueRGB(rgb, degrees) {
	const a = (degrees * Math.PI) / 180, s = Math.sin(a), c = Math.cos(a), k = 0.57735;
	const [r, g, b] = rgb;
	const d = k * (r + g + b) * (1 - c);
	return [
		Math.max(0, r * c + k * (b - g) * s + k * d),
		Math.max(0, g * c + k * (r - b) * s + k * d),
		Math.max(0, b * c + k * (g - r) * s + k * d),
	];
}
