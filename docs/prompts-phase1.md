# Gentle Gal — Phase 1 実行用プロンプト & 履歴

> ComfyUI 実行用にマージ済み。設計意図・元議論は [ART_PROMPTS.md](./ART_PROMPTS.md)。
> 計画は [プラン](C:/Users/prism/.claude/plans/gentle-gyaru-snoopy-stream.md)。

## 共通設定

| 項目 | 値 |
|---|---|
| Resolution | 832×1216 |
| Steps | 30 |
| CFG | 5.0 |
| Sampler | `dpmpp_2m` |
| Scheduler | `karras` |
| Denoise | 1.0 |
| Seed (正規) | 1234567 |
| Seed (予備) | 8675309 |
| Quality prefix | `masterpiece, best quality, very aesthetic, absurdres, anime style, soft skin, shallow depth of field, vertical 9:16,` |

### Run-A: dreamsicle
- Checkpoint: `dreamsicle_v10.safetensors`
- LoRA: `Smooth_Booster_v5` (M0.6 / C1.0) + `Best_Facial_Expression_Helper_XTREME_ILLU` (M0.7 / C1.0)

### Run-B: wai
- Checkpoint: `waiIllustriousSDXL_v160.safetensors`
- LoRA: 同上 smooth_expr

## ネガティブ（共通・SmartDoll + ブレスト統合）

```
lowres, bad anatomy, bad hands, missing fingers, extra digits, deformed,
text, censored, mosaic, blurry, jpeg artifacts, watermark, signature,
multiple girls, real photo, scenery outdoors, male face visible, head cropped,
sailor collar, school uniform, pleated skirt with school colors,
elementary school, middle school student,
(child:1.4), (loli:1.4), petite,
ugly nails, plain nails, short nails,
deformed face, asymmetric eyes,
ahegao, scary, evil
```

## Identity Anchor（4 シーン共通・先頭固定）

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
black pencil skirt (knee length), black stockings,
```

## ① WAIT-01（待機・塩対応）— Phase 1A

**フル ポジティブ（quality prefix + identity anchor + scene）:**
```
masterpiece, best quality, very aesthetic, absurdres, anime style, soft skin, shallow depth of field, vertical 9:16,
1girl, mature female, adult woman, 20 years old,
gyaru, gal makeup, beauty vocational school student,
(sharp eyes:1.1), defined eye shape, almond eyes,
light tan skin, sun-kissed skin,
long wavy brown hair, side bangs, voluminous hair,
heavy eye makeup, long eyelashes, eyeliner, glossy pink lips,
hoop earrings, multiple ear piercings,
long decorated nails, gel nails, rhinestone nails,
(recruit suit:1.2), (job hunting attire:1.2),
black blazer worn open, white blouse partially unbuttoned,
loosened black ribbon tie,
black pencil skirt (knee length), black stockings,

sitting at study desk, cheek rest pose, leaning on left hand,
holding smartphone in right hand, phone tilted upward,
side glance toward viewer, half-lidded eyes (bored),
neutral expression, slight pout, mouth closed,
disinterested look, unimpressed,
relaxed slouch, legs crossed under desk,

beauty school practical room, makeup studio classroom,
makeup station with vanity mirror in background blurred,
blackboard with nail art sketches, doodles,
job hunting documents stacked on desk corner,
empty coffee can, decorated phone case,
late afternoon orange light through windows, golden hour,

medium shot, eye-level, vertical composition,
depth of field, soft bokeh background
```

## ② ACT-01（手）— Phase 1B / IPAdapter

**フル ポジティブ:**
```
masterpiece, best quality, very aesthetic, absurdres, anime style, soft skin, shallow depth of field, vertical 9:16,
1girl, mature female, adult woman, 20 years old,
gyaru, gal makeup, beauty vocational school student,
(sharp eyes:1.1), defined eye shape, almond eyes,
light tan skin, sun-kissed skin,
long wavy brown hair, side bangs, voluminous hair,
heavy eye makeup, long eyelashes, eyeliner, glossy pink lips,
hoop earrings, multiple ear piercings,
long decorated nails, gel nails, rhinestone nails,
(recruit suit:1.2), (job hunting attire:1.2),
black blazer slipped off shoulder, blouse sleeve rolled up,
loosened black ribbon tie,
black pencil skirt (knee length), black stockings,

sitting beside viewer, body angled toward viewer,
(both hands gently holding viewer's hand:1.3) on nail desk,
delicate grip, fingers intertwined, fingertip focus,
focused expression, slight smile, soft gaze down at hand,
mild affection, no longer bored,
phone set aside on desk corner,

nail art station, nail desk surface in foreground,
professional nail lamp glowing UV light,
gel polish bottles arranged, cotton pads,
warm desk lamp from side, intimate atmosphere,

(close-up on hands and face:1.2),
vertical composition with hands centered lower frame,
upper frame her face looking down, lower frame hand grip detail,
shallow depth of field, hand focus, bokeh background
```

## ③ ACT-02（口）— Phase 1B / IPAdapter

**フル ポジティブ:**
```
masterpiece, best quality, very aesthetic, absurdres, anime style, soft skin, shallow depth of field, vertical 9:16,
1girl, mature female, adult woman, 20 years old,
gyaru, gal makeup, beauty vocational school student,
(sharp eyes:1.1), defined eye shape, almond eyes,
light tan skin, sun-kissed skin,
long wavy brown hair, side bangs, voluminous hair,
heavy eye makeup, long eyelashes, eyeliner, glossy pink lips,
hoop earrings, multiple ear piercings,
long decorated nails, gel nails, rhinestone nails,
(recruit suit:1.2), (job hunting attire:1.2),
black blazer fully off draped on chair behind,
white blouse top buttons undone showing collarbone,
loosened black ribbon tie almost falling,
black pencil skirt (knee length), black stockings,

sitting in makeup chair, leaning forward toward viewer,
strong eye contact looking up at viewer,
(parted glossy lips:1.3), (lip gloss shine:1.2),
tongue slightly visible, wet lips,
half-lidded seductive eyes, soft blush, warm expression,
holding lipstick tube near lips, lipstick poised,
clearly interested, affectionate gaze,

makeup studio, three-way mirror behind,
mirror reflection showing back of head, multiple angles,
makeup palette, lipstick collection on vanity,
tissues, cotton swabs,
white studio lights, ring light glow, vanity bulbs framing,
(mirror reflection:1.1),

(face close-up, mouth focus:1.2),
vertical composition, face occupying upper-mid frame,
slight low angle to emphasize lips
```

## ④ ACT-03（抱）— Phase 1B / IPAdapter

**フル ポジティブ:**
```
masterpiece, best quality, very aesthetic, absurdres, anime style, soft skin, shallow depth of field, vertical 9:16,
1girl, mature female, adult woman, 20 years old,
gyaru, gal makeup, beauty vocational school student,
(sharp eyes:1.1), defined eye shape, almond eyes,
light tan skin, sun-kissed skin,
long wavy brown hair, side bangs, voluminous hair,
heavy eye makeup, long eyelashes, eyeliner, glossy pink lips,
hoop earrings, multiple ear piercings,
long decorated nails, gel nails, rhinestone nails,
(recruit suit:1.2), (job hunting attire:1.2),
black blazer fallen on floor, white blouse open,
ribbon tie loosened completely fallen,
black pencil skirt hiked up, black stockings,

lying back on teacher's desk, soft surrender pose,
back slightly arched, (blouse open showing cleavage:1.2),
skirt hiked up showing stocking tops, garter visible,
strong blush on cheeks and ears, vulnerable expression,
parted lips, slightly trembling, soft breath,
(intense eye contact:1.2), looking up at viewer with affection,
long hair spread on desk surface,
one hand reaching up toward viewer, fingers extended,
embarrassed but accepting, soft and open,

classroom podium, teacher's desk top cleared,
blackboard background with nail art doodles in chalk,
job hunt folder fallen on floor edge of frame,
textbooks pushed to edge,
phone fallen on floor, screen still glowing,
empty classroom evening,
(dusk light through windows:1.3), warm orange sunset light,
single fluorescent light overhead, soft shadows,

(full body composition:1.1), low angle, intimate framing,
vertical composition, body diagonal across frame
```

---

## 実行履歴

> 各バッチごとに run_label・seed・採用画像・所感を追記する。

### Run-A1 (dreamsicle / WAIT-01)
- 投入日時: TBD
- run_label: `gentle-gyaru-v1/run-A-dreamsicle/wait-01`
- seed: 1234567
- batch: TBD
- 採用ファイル: TBD
- 所感: TBD

### Run-B1 (wai / WAIT-01)
- 投入日時: TBD
- run_label: `gentle-gyaru-v1/run-B-wai/wait-01`
- seed: 1234567
- batch: TBD
- 採用ファイル: TBD
- 所感: TBD

### Phase 1A 採用結果
- 採用モデル: TBD（Run-A or Run-B）
- 採用 seed: TBD
- 採用ファイルパス（IPAdapter input）: TBD

### Phase 1B (ACT-01/02/03 with IPAdapter Plus Face)
- IPAdapter weight: 0.65 (initial)
- 各シーン採用結果: TBD
