# Where every part came from

| Part | From | Licence | In this repo |
|---|---|---|---|
| The player | [Effekseer for WebGL](https://github.com/effekseer/EffekseerForWebGL) 1.80.8, from the zip `EffekseerForWebGL1.80.8.zip` on [Effekseer's release 1808](https://github.com/effekseer/Effekseer/releases/tag/1808), unedited | MIT, © 2011 Effekseer Project (`LICENSE` of that repo, and the header of `effekseer.min.js`) | `vendor/effekseer/`, and `public/` for the demo |
| The effects | The `Sample` folder of the official editor release `Effekseer1.80.8Win.zip` (its SHA-256 matched the release's `SHA256SUMS`), exported to `.efk` with that editor's command line | CC0. The notice, `Sample/readme.txt`, covers the whole folder: "All the licenses of these effects are CC-0", and it asks for credit to Effekseer and the contributor where you can | `public/effects/`, `source/`; the notice is `vendor/effekseer/SAMPLES-LICENCE-readme.txt` |
| The floor | [Monastery Stone Floor](https://polyhaven.com/a/monastery_stone_floor), Amal Kumar, Poly Haven, 2k, as WebP | CC0 | `public/floor/` |
| The sky | [Qwantani Dusk 2, puresky](https://polyhaven.com/a/qwantani_dusk_2_puresky), Poly Haven, 1k | CC0 | `public/sky/` |
| three.js | The three.js authors, 0.186.1, from npm | MIT | bundled in the build |
| Red Hat Mono 500 | The Red Hat Project Authors | SIL OFL 1.1 | `fonts/` |
| The demo, its look, `src/player.js` | Patch | MIT | the rest |
| The pictures of the effects, the cover | stills of this demo | CC0, Patch | `thumbs/`, `cover.jpg` |

## The check of the effects' licence

- Every text file in the release's `Sample` folder was read, and every project searched for licence, copyright and author text. Only `Sample/readme.txt` says anything about licences; `00_Version16/readme.txt` and `03_Hanmado01/readme.txt` only say their HDR files need an HDR display. Nothing contradicts the notice.
- The same notice is in Effekseer's repository as `docs/readme_sample.txt`, and it ships in the folder with the effects, Suzuki's included.
- The release has no sounds. The projects that name sound files (`MagicWater` here) name files that aren't in the release, and nothing in this block plays sound. `source/nextsoft/MagicWater.efkproj` has its sound nodes turned off for that reason; that is the only edit to any effect.

## The effects, by source folder

| Source folder | Pack here | Author (from the folder's name) | Effects |
|---|---|---|---|
| `01_Pierre01` | `pierre-1` | Pierre | Flame, LightningStrike, PhantasmMeteor, PhantasmMeteor_Single, Herald, SonicBoom |
| `01_Pierre02` | `pierre-2` | Pierre | FireBall, CosmicMist, Sword_Ember, Sword_Moonlight, Sword_Sacredlight, Benediction, BloodLance, FeatherBomb |
| `01_NextSoft01` | `nextsoft` | NextSoft | MagicMeteo, MagicWater, MagicCold, MagicTornade, MagicThunder, Sword2, MagicHeal2, PowerUp |
| `01_AndrewFM01` | `andrewfm` | AndrewFM | fire, hit_eff |
| `01_Suzuki01` | `suzuki` | Suzuki | aura, sword |
| `02_Tktk03` | `tktk` | tktk | Light, ToonHit, ToonWater |
| `00_Version16` | `effekseer-1.6` | the Effekseer project (no author named) | Aura01, Barrior01, Barrior02, Barrior03 |

Nothing here is from a store or under game-only terms: code is MIT, art is CC0, the font is OFL.
