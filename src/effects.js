// The effects in this block, by group. `file` is under public/effects/. The other numbers are measured
// (effects.baked.json, written by bake.mjs); a line here can override them:
//   size: how big it plays, in metres across at Size 1 (default 7.5)
//   lift: how far above the floor its origin sits, in metres (default: enough to keep it above the floor)
//   life: stop it after this many seconds (for effects that go on, or never end by themselves)
//   pace: how much faster it plays than made, at Speed 1 (for the long sword sequences)
//   at: the frame its picture shows (default: its measured best moment)
// 한국어판: id·file·수치는 원작 그대로 두고, 화면에 보이는 group·label만 한국어로 옮겼다.
export const GROUPS = ['불', '물·얼음', '번개', '검', '회복·신성', '어둠', '보호막', '타격'];

export const EFFECTS = [
	{ id: 'fireball', label: '파이어볼', group: '불', file: 'pierre-2/FireBall.efk', author: 'Pierre', size: 7, life: 4, at: 150 },
	{ id: 'flame-ring', label: '화염 고리', group: '불', file: 'pierre-1/Flame.efk', author: 'Pierre', size: 11, at: 138 },
	{ id: 'fire-burst', label: '화염 폭발', group: '불', file: 'andrewfm/fire.efk', author: 'AndrewFM', lift: 0 },
	{ id: 'falling-ember', label: '낙하하는 불티', group: '불', file: 'nextsoft/MagicMeteo.efk', author: 'NextSoft', size: 8.5 },

	{ id: 'water-burst', label: '물 폭발', group: '물·얼음', file: 'nextsoft/MagicWater.efk', author: 'NextSoft', lift: 1 },
	{ id: 'water-spout', label: '물기둥', group: '물·얼음', file: 'tktk/ToonWater.efk', author: 'tktk', size: 9, lift: 0 },
	{ id: 'frost-fall', label: '서리 낙하', group: '물·얼음', file: 'nextsoft/MagicCold.efk', author: 'NextSoft', size: 9, lift: 0 },
	{ id: 'cold-mist', label: '냉기 안개', group: '물·얼음', file: 'pierre-2/CosmicMist.efk', author: 'Pierre', at: 69 },
	{ id: 'tornado', label: '토네이도', group: '물·얼음', file: 'nextsoft/MagicTornade.efk', author: 'NextSoft', size: 9 },

	{ id: 'lightning-strike', label: '낙뢰', group: '번개', file: 'pierre-1/LightningStrike.efk', author: 'Pierre', size: 11 },
	{ id: 'thunderbolt', label: '벼락', group: '번개', file: 'nextsoft/MagicThunder.efk', author: 'NextSoft', size: 13, at: 15 },
	{ id: 'storm-orb', label: '폭풍 구체', group: '번개', file: 'suzuki/001_magma_effect/aura.efk', author: 'Suzuki', size: 5.5, life: 6, lift: 3.4 },

	{ id: 'ember-blade', label: '화염검', group: '검', file: 'pierre-2/Sword_Ember.efk', author: 'Pierre', size: 17, pace: 1.6, lift: 3.5, at: 162 },
	{ id: 'moonlight-blade', label: '월광검', group: '검', file: 'pierre-2/Sword_Moonlight.efk', author: 'Pierre', size: 17, pace: 1.6, lift: 3.5, at: 162 },
	{ id: 'sacred-blade', label: '성광검', group: '검', file: 'pierre-2/Sword_Sacredlight.efk', author: 'Pierre', size: 14, pace: 1.6, lift: 3.5, at: 351 },
	{ id: 'crescent-slash', label: '초승달 베기', group: '검', file: 'nextsoft/Sword2.efk', author: 'NextSoft' },
	{ id: 'golden-cuts', label: '황금 연속 베기', group: '검', file: 'suzuki/002_sword_effect/sword.efk', author: 'Suzuki', size: 10 },

	{ id: 'benediction', label: '축복', group: '회복·신성', file: 'pierre-2/Benediction.efk', author: 'Pierre', at: 60 },
	{ id: 'healing-light', label: '치유의 빛', group: '회복·신성', file: 'nextsoft/MagicHeal2.efk', author: 'NextSoft', size: 8.5, lift: 0 },
	{ id: 'golden-rise', label: '황금 상승', group: '회복·신성', file: 'tktk/Light.efk', author: 'tktk', size: 9, lift: 0 },
	{ id: 'power-up', label: '파워 업', group: '회복·신성', file: 'nextsoft/PowerUp.efk', author: 'NextSoft' },

	{ id: 'blood-lance', label: '피의 창', group: '어둠', file: 'pierre-2/BloodLance.efk', author: 'Pierre', size: 11, at: 30 },
	{ id: 'phantasm-rain', label: '환영 운석우', group: '어둠', file: 'pierre-1/PhantasmMeteor.efk', author: 'Pierre', size: 11 },
	{ id: 'phantasm', label: '환영 운석', group: '어둠', file: 'pierre-1/PhantasmMeteor_Single.efk', author: 'Pierre', size: 9, at: 93 },
	{ id: 'herald', label: '전령', group: '어둠', file: 'pierre-1/Herald.efk', author: 'Pierre', size: 6.5, lift: 3.4, at: 54 },
	{ id: 'toxic-aura', label: '맹독 오라', group: '어둠', file: 'effekseer-1.6/Aura01.efk', author: 'the Effekseer project' },

	{ id: 'hex-shield', label: '마법진 보호막', group: '보호막', file: 'effekseer-1.6/Barrior01.efk', author: 'the Effekseer project', size: 9 },
	{ id: 'red-shield', label: '붉은 보호막', group: '보호막', file: 'effekseer-1.6/Barrior02.efk', author: 'the Effekseer project', size: 9 },
	{ id: 'molten-shield', label: '용암 보호막', group: '보호막', file: 'effekseer-1.6/Barrior03.efk', author: 'the Effekseer project', size: 8.5 },

	{ id: 'spark-hit', label: '스파크 타격', group: '타격', file: 'tktk/ToonHit.efk', author: 'tktk', size: 8, at: 39, lift: 3.4 },
	{ id: 'red-hit', label: '붉은 타격', group: '타격', file: 'andrewfm/hit_eff.efk', author: 'AndrewFM', size: 8, at: 9, lift: 3 },
	{ id: 'shockwave', label: '충격파', group: '타격', file: 'pierre-1/SonicBoom.efk', author: 'Pierre', at: 28 },
	{ id: 'feather-burst', label: '깃털 폭발', group: '타격', file: 'pierre-2/FeatherBomb.efk', author: 'Pierre', size: 9 },
];

export const DEFAULT_EFFECT = 'golden-rise';
