# Gentle Series — Design System

> Gentle Gal で確立する **シリーズ共通デザインシステム** の単一の正解ドキュメント。
> 第2作以降（Friend / Maid / ...）はこのトークンと運用ルールをそのまま継承し、
> `tokens.css` の `--accent*` 4変数だけを書き換えてテーマ置換する。
>
> 関連: [../../SERIES.md](../../SERIES.md)（量産チェックリスト）

---

## 哲学

**余白と空気を残したミニマル**。冷たい・硬いミニマルではない。
受容と優しさを伝える土台として、要素を絞り、軽量・透過・低コントラストで構成する。

---

## ファイル構成

```
src/styles/
├── tokens.css        ← :root CSS variables (このファイルが override point)
├── base.css          ← reset / html / body / .app / .emoji
├── splash.css        ← .splash, .splash-logo*, .splash-bar*
├── layout.css        ← .scene, .full-stage, .bubble-track*
├── components.css    ← .chat-bubble*, .choice-*, .love-gauge*, .audio-toggle*
├── effects.css       ← .action-blackout, .finish-vignette, .finish-flash, .deep-blackout
└── main.css          ← @import エントリポイント
```

`index.html` は `main.css` のみを読み込む。

---

## カラートークン

### キャラ別オーバーライド (4変数のみ)

| 変数 | 役割 | Gentle-Gal | Gentle-Friend (予定) |
|---|---|---|---|
| `--accent`        | 半透明アクセント（ボタン active／chosen 背景） | `rgba(255, 183, 76, 0.55)` | `rgba(232, 196, 160, 0.55)` |
| `--accent-solid`  | アクセントsolid（ハートfilled・ローディングなど） | `#ffb74c` | `#e8c4a0` |
| `--accent-text`   | アクセント上に乗せる文字色 | `#4a2c00` | `#4a3322` |
| `--accent-border` | アクセント枠線 | `rgba(255, 183, 76, 0.85)` | `rgba(232, 196, 160, 0.85)` |

### シリーズ共通（触らない）

| 変数 | 値 | 用途 |
|---|---|---|
| `--ink` | `#1a1a1a` | 標準テキスト |
| `--ink-soft` | `rgba(26, 26, 26, 0.55)` | 補助テキスト |
| `--paper` | `#fafafa` | 背景・余白 |
| `--paper-soft` | `#f0f0f0` | 沈める背景 |
| `--line` | `rgba(26, 26, 26, 0.10)` | 区切り線・ボタン枠 |
| `--hairline` | `var(--line)` | 旧名alias（既存コード互換） |

---

## タイポグラフィ

### フォントファミリ

| トークン | フォント |
|---|---|
| `--font-display` | `'Inter', 'Zen Kaku Gothic New', 'Hiragino Sans', sans-serif` |
| `--font-body`    | `'Inter', 'Zen Kaku Gothic New', 'Hiragino Sans', 'Noto Color Emoji', sans-serif` |
| `--font-emoji`   | `'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif` |

Latin文字は **Inter**、日本語は **Zen Kaku Gothic New**、絵文字は **Noto Color Emoji** に自動振り分け（fallback chainで実現）。

### 重みの目安

- Inter: **200**（ロゴ大文字）/ **300**（ロゴsub・補助）/ **400**（本文）/ **500**（強調・選択肢ラベル）
- Zen Kaku Gothic New: **300**（控えめ） / **400**（本文） / **500**（強調） / **700**（タイトル）

### type scale

| トークン | 値 | 主な用途 |
|---|---|---|
| `--fs-xs` | `0.74rem` | キャプション |
| `--fs-sm` | `0.84rem` | 選択肢ボタン本体 |
| `--fs-md` | `0.92rem` | チャットバブル本文 / ロゴサブ |
| `--fs-lg` | `1.1rem`  | セクション小見出し |
| `--fs-xl` | `1.6rem`  | (予備) |
| `--fs-2xl` | `1.85rem`| ロゴGENTLE |

---

## スペーシング・形状・モーション

```
--sp-1: 0.25em    --sp-2: 0.5em    --sp-3: 0.75em    --sp-4: 1em
--r-sm: 0.5em     --r-md: 1em      --r-pill: 999px
--ease-out: cubic-bezier(0.22, 0.9, 0.32, 1)
--dur-fast: 0.18s --dur-base: 0.4s --dur-slow: 0.9s
```

---

## ロゴ

### 構造（二段ミニマル）

```
GENTLE      ← Inter 200 / 1.85rem / letter-spacing 0.32em
────        ← 細 hairline (1px / width 2.6em / opacity 0.20)
gyaru       ← Inter 300 / 0.92rem / letter-spacing 0.18em / ink-soft
```

HTML:
```html
<div class="splash-logo" role="img" aria-label="Gentle Gyaru">
  <div class="splash-logo__top">GENTLE</div>
  <div class="splash-logo__rule" aria-hidden="true"></div>
  <div class="splash-logo__bottom">gyaru</div>
</div>
```

### 量産時の差し替え

- `splash-logo__top` は **GENTLE** で固定（シリーズ共通の傘ブランド）
- `splash-logo__bottom` のみ slug を入れる: `gyaru` / `friend` / `maid` / `nurse` / ...
- ruleの幅・透明度は触らない

### 余白・最小サイズ

- 画面中央配置、上下に最低 1.6em の余白
- 横方向は 56% 幅のローディングバーが直下に来るので、ロゴ幅は ≤ 220px に収まること
- 縮小は 0.7倍まで。それ以下のサイズでは PWA アイコンを優先

---

## ボタン（選択肢: `.choice-bubble`）

### 状態一覧

| 状態 | 視覚 | 属性 |
|---|---|---|
| default | 白72% / line border / shadow なし | （無し） |
| 押下中 (active) | accent背景・accent-text文字・accent-border枠 | `:active` |
| 条件未達 | 破線 dashed border | `data-conditional="true"` |
| 選択確定 | accent背景・solid border（押下後の永続表示） | `data-chosen="true"` |
| 折りたたみ消滅 | width/padding/margin 0 アニメ | `class="choice-bubble--vanish"` |

### サイズ規定（コンパクト化済）

```
padding: 0.42em 0.95em
font-size: 0.84rem
line-height: 1.4
border-radius: 999px (pill)
backdrop-filter: blur(6px) saturate(140%)
```

`box-shadow` は使わない（フラット）。

---

## ラブゲージ・音声トグル

### `.love-gauge`

- 左上 0.7em / 0.7em 配置
- pill背景 `rgba(255,255,255,0.65)` + line border + blur(10px)
- 3個のハート間隔 `gap: 0.2em`
- ハート絵文字は `class="emoji"` 必須（Noto Color Emoji 適用）
- filled 状態: `data-filled="true"` で grayscale解除＋scale 1.05

### `.audio-toggle`

- 右上 0.7em 0.7em / 32×32px / circle
- アイコン（🔊 / 🔇）も `class="emoji"` 必須
- muted 時は灰色背景

---

## 絵文字運用ルール

絵文字を含む UI 要素には **必ず `class="emoji"` を付与**する。

```html
<!-- OK -->
<span class="love-gauge__heart emoji" aria-hidden="true">💗</span>

<!-- NG: OS依存になりクロスプラットフォーム差異が出る -->
<span class="love-gauge__heart">💗</span>
```

### アクセシビリティ

- 装飾用絵文字（ハート、🔊 等）には `aria-hidden="true"` を併記
- 親要素に `aria-label` を付けて意味を伝える（例: `<button aria-label="音声 ON/OFF">`）

### JSで絵文字 icon を生成する場合

`ChatBubbles.js` の `.choice-lock` と同様に、icon span を作る時は:
```js
const icon = document.createElement('span');
icon.className = 'choice-lock emoji';
icon.setAttribute('aria-hidden', 'true');
icon.textContent = item.icon;
```

---

## モーション原則

- 入場: `bubble-in` 0.62s（translateY 14px → 0、scale 0.96 → 1、blur(4px) → 0）
- ボタン押下: 0.12s scale(0.97)
- シーン遷移: 1.0s opacity fade
- 入場の `cubic-bezier` は `--ease-out`（0.22, 0.9, 0.32, 1）— 始まり遅め・終わりやわらか
- 演出 blackout: 2.0s（finish 入りと退出を対称に）

---

## やらないこと（DO NOT）

- 装飾的セリフ（Cormorant Garamond 等）の追加
- グラデーション背景（`--paper` 一色を維持）
- 強い影 (`box-shadow`) — 押下感が必要なら scale で代用
- 鮮やかな彩度（彩度はaccent 1色に絞る）
- 角ばったボタン（pill か、せいぜい `--r-md` まで）
- 絵文字の OS 依存表示（必ず `class="emoji"`）

---

## 拡張時のチェック

新しい UI コンポーネントを追加する時:

1. `tokens.css` の既存変数で表現できないか先に検討
2. 不可避なら `components.css` に追加（HTML class はBEM風）
3. 新しい色トークンが必要なら、`tokens.css` の **シリーズ共通**側に追加（character override にしない）
4. 絵文字を使うなら `emoji` クラス＋`aria-hidden` を必ず付ける
5. `npm run build` が警告無く通ることを確認
6. 本ドキュメントを更新
