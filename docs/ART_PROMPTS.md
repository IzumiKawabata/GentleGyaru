# Gentle Gal — Art Prompts

> **エンジン: ComfyUI**（NovelAI は 2026-04-29 方針切替により不使用）。シーンごとの画像生成プロンプト・設計意図。
> Izumi 2026-04-29 議論版。easy 部門 Queue G016 で実生成。
> SmartDoll #17（GYARU archetype）を流用したダミーが入っているが、本番は本書のプロンプトに沿って再生成する。
>
> 実行用のマージ済みプロンプト・seed・モデル・LoRA・採用履歴は [prompts-phase1.md](./prompts-phase1.md) を参照。

## キャラコンセプト

**就活スーツのギャル（美容専門学校生）**
- 20歳、まじめ枠じゃないけど面倒見いい先輩タイプ
- ジャケット羽織り→片肩→脱ぎ捨て の段階進行
- ネイル・ピアス・ヘアメイクは強め、けど顔立ちはシャープで凜
- やさしいギャル＝最初は塩、関わるほどに溶けていく

---

## ネガティブプロンプト（全シーン共通）

```
lowres, bad anatomy, bad hands, missing fingers, extra digits,
blurry, jpeg artifacts, watermark, signature, text,
sailor collar, school uniform, pleated skirt with school colors,
elementary school, middle school student,
(child:1.4), (loli:1.4), petite,
ugly nails, plain nails, short nails,
deformed face, asymmetric eyes
```

**設計意図:**
- `blazer uniform` を抜いた → 就活ジャケットへの干渉を避ける
- `sailor collar, school uniform` で**セーラー服固有の要素のみ**ピンポイント排除
- `(child:1.4) (loli:1.4) petite` の3点で幼さを抑える（顔造形に効きすぎる `young, flat chest` は使わない）
- `pleated skirt with school colors` で**学校感のあるプリーツのみ**殺し、タイトスカートは生かす
- ネイルへの妥協排除（`ugly/plain/short nails` 禁止）

---

## 全体共通プロンプト（キャラ精度up版）

```
1girl, mature female, adult woman, 20 years old,
gyaru, gal makeup, beauty vocational school student,
(sharp eyes:1.1), defined eye shape, almond eyes,
light tan skin, sun-kissed skin,
long wavy brown hair, side bangs, voluminous hair,
heavy eye makeup, long eyelashes, eyeliner, glossy pink lips,
hoop earrings, multiple ear piercings,
long decorated nails, gel nails, rhinestone nails,

(recruit suit:1.2), (job hunting attire:1.2),
black blazer (open), white blouse (unbuttoned),
loosened black ribbon tie,
black pencil skirt (knee length), black stockings
```

**設計意図:**
- `mature female, adult woman, 20 years old` を冒頭で**明示数値**化（loli対策を顔造形を壊さず実装）
- `sharp eyes, defined eye shape, almond eyes` でギャル特有の目造形を強化
- `(recruit suit:1.2), (job hunting attire:1.2)` で就活スーツの強調
- `black blazer (open)` で**着てるけど開けてる/羽織ってる/脱ぎかけ**を明示

---

## 着崩れの段階進行（視覚的階層）

| シーン | ジャケット | ブラウス | リボン | 体勢/感情 |
|---|---|---|---|---|
| 待機 (WAIT-01) | 羽織ってる open | 第一ボタン外し | 緩めてる | 塩、頬杖、スマホいじる |
| 待機 Stage 2 (WAIT-02) | 羽織ってる、片肩落ち気味 | 開け気味 | だいぶ崩れた | 打ち解け、ふんわり笑顔 |
| ACT-01 手 | 片肩から落ちる | 袖まくり | そのまま | 微笑、両手で包む |
| ACT-02 口 | 椅子の背に脱ぎ捨て | 鎖骨見える | 解けかけ | 見上げ、リップ持ち |
| ACT-03 抱 | 床に落ちてる | 胸元開く | 完全に解けて落ちる | 仰向け、開いて受け入れ |

→ 画を見ただけで何番目か分かる視覚階層を作る。

---

## ① 待機画面 WAIT-01（縦・塩対応）

```
[共通キャラ] +
sitting at study desk, cheek rest pose, leaning on left hand,
holding smartphone in right hand, phone tilted upward,
side glance toward viewer, half-lidded eyes (bored),
neutral expression, slight pout, mouth closed,
disinterested look, unimpressed,
relaxed slouch, legs crossed under desk,
black blazer worn open, blouse partially unbuttoned,

beauty school practical room, makeup studio classroom,
makeup station with vanity mirror in background blurred,
blackboard with nail art sketches, doodles,
job hunting documents stacked on desk corner,
empty coffee can, decorated phone case,
late afternoon orange light through windows, golden hour,

medium shot, eye-level, vertical composition,
832x1216, depth of field, soft bokeh background,
(masterpiece:1.2), best quality, very aesthetic
```

**WAIT-02（Stage 2 打ち解け版）の差分:**
- `half-lidded eyes (bored)` → `soft smile, warm gaze`
- `disinterested look, unimpressed` → `welcoming gaze, slight curiosity`
- `slight pout` → `relaxed mouth, slight smile`
- `cheek rest pose, leaning on left hand` → `relaxed pose facing viewer slightly`
- ジャケットを片肩から落とす（`black blazer slipped off one shoulder`）

---

## ② メニューA: 手で ACT-01（縦・手をフィーチャー）

**部位を立てる戦略:** 縦構図で**上半分=表情、下半分=手元アップ**の二層構造。

```
[共通キャラ] +
sitting beside viewer, body angled toward viewer,
(both hands gently holding viewer's hand:1.3) on nail desk,
delicate grip, fingers intertwined, fingertip focus,
focused expression, slight smile, soft gaze down at hand,
mild affection, no longer bored,
black blazer slipped off shoulder, blouse sleeve rolled up,
phone set aside on desk corner,

nail art station, nail desk surface in foreground,
professional nail lamp glowing UV light,
gel polish bottles arranged, cotton pads,
warm desk lamp from side, intimate atmosphere,

(close-up on hands and face:1.2),
vertical composition with hands centered lower frame,
upper frame her face looking down, lower frame hand grip detail,
shallow depth of field, hand focus, bokeh background,
832x1216,
(masterpiece:1.2), best quality, very aesthetic
```

**キモ:** `both hands gently holding viewer's hand:1.3` で**両手で包む**所作を強調。ネイルが視覚的に強い属性なので、画面下半分で爪のディテール。

---

## ③ メニューB: 口で ACT-02（縦・口元をフィーチャー）

```
[共通キャラ] +
sitting in makeup chair, leaning forward toward viewer,
strong eye contact looking up at viewer,
(parted glossy lips:1.3), (lip gloss shine:1.2),
tongue slightly visible, wet lips,
half-lidded seductive eyes, soft blush, warm expression,
holding lipstick tube near lips, lipstick poised,
clearly interested, affectionate gaze,
black blazer fully off, draped on chair behind,
blouse top buttons undone showing collarbone,

makeup studio, three-way mirror behind,
mirror reflection showing back of head, multiple angles,
makeup palette, lipstick collection on vanity,
tissues, cotton swabs,
white studio lights, ring light glow, vanity bulbs framing,
(mirror reflection:1.1),

(face close-up, mouth focus:1.2),
vertical composition, face occupying upper-mid frame,
slight low angle to emphasize lips,
832x1216,
(masterpiece:1.2), best quality, very aesthetic
```

**キモ:** `parted glossy lips:1.3` `lip gloss shine:1.2` `wet lips` の三段重ねで口元の質感を立てる。リップを手に持たせて「塗り直しの延長」モチーフ。鏡で後ろからの視点も入れて部位を多角化。

---

## ④ メニューC: 抱く ACT-03（縦・全身×親密度）

```
[共通キャラ] +
lying back on teacher's desk, soft surrender pose,
back slightly arched, (blouse open showing cleavage:1.2),
skirt hiked up showing stocking tops, garter visible,
strong blush on cheeks and ears, vulnerable expression,
parted lips, slightly trembling, soft breath,
(intense eye contact:1.2), looking up at viewer with affection,
long hair spread on desk surface,
one hand reaching up toward viewer, fingers extended,
embarrassed but accepting, soft and open,
black blazer fallen on floor, ribbon tie loosened completely,

classroom podium, teacher's desk top cleared,
blackboard background with nail art doodles in chalk,
job hunt folder fallen on floor edge of frame,
textbooks pushed to edge,
phone fallen on floor, screen still glowing,
empty classroom evening,
(dusk light through windows:1.3), warm orange sunset light,
single fluorescent light overhead, soft shadows,

(full body composition:1.1), low angle, intimate framing,
vertical composition, body diagonal across frame,
832x1216,
(masterpiece:1.2), best quality, very aesthetic
```

**キモ:** Cは部位の特定アップじゃなく**全身の状態**で本気度を見せる。`back arched`(背反らせ)、`hand reaching up`(手を伸ばす)、`hair spread`(髪が広がる) — 体の各所が**プレイヤーに開いてる**サインで埋める。「スマホが床に落ちてる」`phone fallen on floor, screen still glowing` で待機画と対比。

---

## フィニッシュ系プロンプト（FIN-01/02/03）TBD

各メニュー直後の余韻演出。
- FIN-01（手の余韻）: 重ねた手を握ったまま、爪が viewer の指先に当たる、目を閉じて満足げ
- FIN-02（口の余韻）: 唇に親指、にやり、口紅がよれた跡
- FIN-03（抱の余韻）: 上向き、汗ばむ肌、開いた手のひらを viewer に差し出す

要 Izumi レビュー後に確定。

---

## 生成順序の推奨（ComfyUI 運用）

1. **WAIT-01 を先に固める**（dreamsicle / wai 両モデル比較バッチ）→ ジャケット羽織り方、髪型、顔造形、肌色、モデル選定を確定
2. WAIT-01 の採用 1 枚から seed・モデル・LoRA weight を確定し、画像を IPAdapter Plus Face の参照画像に投入
3. **IPAdapter Plus Face**（`ip-adapter-plus-face_sdxl_vit-h.safetensors`）に WAIT-01 を渡し、②③④を派生生成 → 顔ブレ抑制
4. WAIT-02 は WAIT-01 の表情差分として生成（同 seed + 表情変更）
5. ACT-01/02/03 はメニュー進行とジャケット着崩れを意識
6. FIN-01/02/03 は ACT の直後（同セッション内、髪・汗・表情の連続性）

---

## メニュー4 → 3 の整合

要件書 v1.1 はメニュー3種固定。提案された4メニュー（手/口/挿入A/挿入B）を3メニューに集約:

| 仕様書 | プロンプト議論 | 採用 |
|---|---|---|
| ACT-01（軽め） | ② 手で | 採用 |
| ACT-02（中） | ③ 口で | 採用 |
| ACT-03（本番） | ④ 抱きたい | 採用 |

ACT-03 を「本番（挿入）」と読み替える。

---

## 関連

- 仕様書: [SPEC.md](../SPEC.md)
- 未確定事項: [OPEN_QUESTIONS.md](../OPEN_QUESTIONS.md)
- アセット格納: [README.md](../README.md) の早見表
