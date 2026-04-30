# Gentle Gal 実装仕様 v1.1

> 要件書 v1.1（2026-04-29 Izumi 提示）の整理版。実装はこの仕様書に従う。
> 未確定項目は `OPEN_QUESTIONS.md` に分離。

## 基本情報

| 項目 | 内容 |
|---|---|
| 作品名 | Gentle Gal |
| 日本語サブタイトル | やさしいギャル |
| シリーズ番号 | Gentle Series #1 |
| 想定制作期間 | 3〜4週間 |
| 想定価格 | 880〜1,320円（OPEN_QUESTIONS） |
| 制作者名義 | 別名義（メインライン完全分離） |
| 対象年齢 | 成人向け（R-18） |

## シリーズラインナップ

| 順位 | 作品名 | 日本語サブ | 状態 |
|---|---|---|---|
| #1 | Gentle Gal | やさしいギャル | **本作（実装中）** |
| #2 | Gentle Maid | やさしいメイド | 検討中 |
| #3 | Gentle Nurse | やさしいナース | 検討中 |
| #4 | Gentle Wife | やさしい人妻 | 検討中 |
| #5 | Gentle Witch | やさしい魔女 | 検討中 |
| #6 | Gentle Elf | やさしいエルフ | 検討中 |
| #7 | Gentle OL | やさしいOL | 検討中 |
| #8 | Gentle Idol | やさしいアイドル | 検討中 |
| #9 | Gentle Teacher | やさしい先生 | 検討中 |

シリーズ#2以降は本作のシステムを継承し、キャラと画像差し替えで量産。

## 哲学

- 完全ノンバーバル
- ループ構造
- キャラ画一点集中（背景とキャラを分離せず、キャラ画＝全画面）

## 技術スタック

| レイヤー | 技術 |
|---|---|
| ゲーム本体 | HTML5 + JavaScript（ES Modules） |
| ゲームフレームワーク | PixiJS 8.x |
| Android化 | Capacitor |
| PC化 | Electron（electron-builder） |
| Web版 | PWA（自前VPS + 独自ドメイン） |
| ビルド | Vite 5.x |
| 音声形式 | ogg |
| 画像形式 | webp（静止画・アニメーション両用） |

## 画面フロー

```
[起動]
  ↓
[メニュー待機画面（WaitingScene）] ←──────────┐
  ↓ アイコンタップ                            │
[行為シーン（ActionScene）]                    │
  ↓ 発射タップ                                │
[フィニッシュシーン（FinishScene）]            │
  ↓ 自動遷移                                  │
[メニュー待機画面（好意度2段階目）]────────────┘
```

**特徴**:
- タイトル画面なし
- 起動から即体験開始
- 受付とメニュー選択は同一画面に統合

---

## 画面詳細仕様

### 1. WaitingScene（待機画面・1ラリー会話）

役割: 受付兼メニュー選択。**白黒ミニマル + アクセント黄色** + チャット内選択肢（Izumi 2026-04-29 確定）。

| 要素 | 仕様 |
|---|---|
| 全画面: キャラ画 | 待機ポーズ、画面下端に向け薄い黒へフェード（可読性確保） |
| `bubble-track` 一本化 | キャラ発話・プレイヤー発話・選択肢グループが全て積まれる単一トラック |
| キャラバブル | 白カード `#fff` + 黒枠 `rgba(17,17,17,0.18)` + 黒文字、左寄せ |
| プレイヤーバブル | アクセントカラー（黄色 `#ffea4f`）、右寄せ |
| 選択肢グループ | チャット内に右寄せで挿入。1. 2. 3. ナンバリング、ロック時は破線+🔒 |
| 隠しリセット | 右上ダブルタップで全状態リセット |

**1ラリー会話フロー（Izumi 2026-04-30 確定）:**
```
[char] 「よろしく〜。なに、緊張してる？」
[choices] [1. 手で] [2. 🔒 口で] [3. 🔒 本番で]   ← チャット内右寄せ
   ↓ プレイヤーが「1. 手で」タップ
[choices keepOnly] 選んだ「1. 手で」だけ残り、他は折りたたみで消える（450ms）
[char] 「やさしくしてあげる」  ← 280ms 後
   ↓ 1秒余韻
ActionScene 遷移
```

選んだ choice バブル自体がプレイヤーの発話として履歴に残る。別途 player phrase バブルは不要。

**OK系（ACCEPT_BUBBLES）プール:**
- 手で: 「任せて〜...指、すっごく丁寧にいくね」「やさしくしてあげる」「ふふ、じゃ手だしな？」
- 口で: 「ん〜...いいよ、口で。」「リップ落ちちゃうけど、ま、いっか」「ちょっと、目つぶってて」
- 本番で: 「本気でいくの？...いいよ、ちゃんと受け止める」「ここまで来たら全部あげる」「もう、しょうがないな〜」

**翌日朝モード** (FinishScene 帰還時):
- NEXT_DAY_GREETINGS から挨拶選択
  - 「おはよ〜。昨日はありがと？」
  - 「よく眠れた？...って、また会いに来ちゃってさ」
  - 「お、昨日の今日でまた来たんだ。元気じゃん」

**TRANSITION_MS = 1000**（src/scenes/WaitingScene.js）

**アクセントカラーの差し替え（heroine別）:**
- `:root { --accent: rgba(169,200,230,0.62); --accent-solid: #a9c8e6; }` を CSS 変数化済み
- Gentle Gal #1 = MIKU（gentle-shy）の薄ブルー
- Gentle Maid #2 以降は heroine の themeColor に合わせて変更
  - メイドなら桜色 `#eab8c8`
  - ナースなら水色 `#a8d4e0`
  - 等

**バブルデザイン（フロステッドガラス）**:
- `backdrop-filter: blur(14px) saturate(160%)` で背景キャラ画が透ける
- キャラバブル: `rgba(255,255,255,0.55)` + 白縁
- プレイヤーバブル: `var(--accent)` (アクセント色半透明) + `var(--accent-border)` (アクセント縁)
- 選択肢: 白半透明 + 黒枠（ロック時は破線+🔒）

### 2. ActionScene（行為シーン）

役割: 選択した行為のループアニメ表示。

| 要素 | 仕様 |
|---|---|
| 全画面表示 | キャラ画（行為中）のループアニメ |
| ループ長さ | 3〜5秒 |
| 発射タップボタン | 一定時間後にふわっとフェードイン |
| ゲージ | なし |

**Fire/Keep 仕様（Izumi 2026-04-30 確定）**:
- 行為開始から **5秒**経過で `bubble-track` 内に choice-group「🔥 Fire / Keep」表示
- Fire: フィニッシュシーンへ遷移
- Keep: キャラ反応バブル（KEEP_REPLIES「まだ？...じゃ、もう少し付き合ってあげる」等）→ 7秒後に再 prompt
- play中タップ（キャラ画タップ）と並行して使える
- 単独 fire-btn は廃止、UI は選択肢バブルに統一

定数: `FIRE_PROMPT_MS = 5_000` / `KEEP_REPROMPT_MS = 7_000`（src/scenes/ActionScene.js）

**play中バブル仕様（Izumi 2026-04-29 追加）:**
- 行為シーンのキャラ画タップで反応バブル + 短ボイス
- バブルはメニュー進行（0=軽め、1=中、2=本番）に応じた発話プールから順次抽出
- クールダウン 800ms（連打抑制）
- ChatBubbles ユーティリティ (`src/ui/ChatBubbles.js`) を WaitingScene と共有
- 候補例（ACT-01 軽め）: 「もー、せっかちじゃん？」「んっ...そこ?」「ふふっ、いい感じ〜」「あ、なに〜照れる」
- voice はランダム選択（`PLAY_TAP_VOICES` × 3）

### 3. FinishScene（フィニッシュシーン・5フェーズ）

役割: フィニッシュ演出 → 余韻×2 → 約束 → 深ブラックアウト → 連続セッション感（Izumi 2026-04-30 余韻拡張）。

| フェーズ | タイミング | 内容 |
|---|---|---|
| ① フィニッシュ画像 | `0.0s` | flash + radial vignette + キャラ画（FIN-01/02/03） |
| ② 余韻セリフ① | `1.6s` | 即座の反応「ふぅ...指つかれた？」 |
| ③ 余韻セリフ② | `5.2s` | 噛みしめる「ネイル汚しちゃった、ま、また塗ればいっか」 |
| ④ 最下位の約束 | `8.4s` | 「ね、もうちょい一緒にいよ」「次は何しよっか」 |
| ⑤ 深ブラックアウト | `11.0s` | `.deep-blackout` opacity 0→1（**2秒**で完全暗転） |
| ⑥ 自動遷移 | `13.0s` | `finish:complete` 発火 → WaitingScene afterFinish モード |

定数: `FINISH_DURATION_MS = 13000` / `FINISH_AFTERGLOW_1_MS = 1600` / `FINISH_AFTERGLOW_2_MS = 5200` / `FINISH_PROMISE_MS = 8400` / `FINISH_BLACKOUT_MS = 11000`

finish-bubbles は max=1（噛みしめる時間確保）。古いセリフはフェードアウトして新しいセリフに置き換わる。

**afterFinish モード（waiting 帰還、連続セッション感）**:
- App が `_gotoWaiting({ afterFinish: true })` を呼ぶ
- WaitingScene が AFTER_FINISH_GREETINGS から挨拶選択（時間スキップなし）
  - 「ふぅ...まだする？」
  - 「まだ余裕じゃん？...次どうする？」
  - 「一回じゃ物足りない？」
  - 「もう一個いっとく？」
  - 「ね、もうちょい付き合ってよ」
- Stage 2 画像は WAIT-02 で表示、挨拶のみ連続感
- afterFinish は復帰直後のみ、次回以降は通常の Stage 2 挨拶

---

## 好意度システム（2軸: Stage + LoveGauge）

### 軸1: affectionStage（待機キャラ画）

| 段階 | 状態 | 待機画面 |
|---|---|---|
| Stage 1 | 初回（行為経験なし） | キャラ画A（少し距離感あり、観察的な態度） |
| Stage 2 | 2回目以降（1回でも行為完了済み） | キャラ画B（打ち解けた、フランクな態度） |

- Stage 1 で任意の行為を1回完了 → Stage 2 へ
- Stage 2 は永続（リセット時のみ Stage 1 に戻る）

### 愛情ゲージUI（左上常設、Izumi 2026-04-30）
- 左上 fixed に 💗 × 3 のハートインジケーター
- `data-filled="true"` で発色、`false` でグレー
- `app[data-route="finish"]` で非表示（演出時）
- `recordMainReject` で本番強要時にゲージ -1（受容哲学の表現）

### 軸2: loveGauge（本番解放、Izumi 2026-04-30 追加）

| ゲージ | 表示 | ACT-03 (本番) |
|---|---|---|
| 0 / 3 | 「本番で ・・・」 | 押せるが reject |
| 1 / 3 | 「本番で 💗・・」 | 押せるが reject |
| 2 / 3 | 「本番で 💗💗・」 | 押せるが reject |
| 3 / 3 | 「本番で 💗」 | OK、ACT-03 遷移 |

- ACT-01/02 はいつでも押せる。fire するたびに loveGauge += 1（MAX で頭打ち）
- ACT-03 は loveGauge < MAX で `conditional`（破線枠）→ 押すと reject バブル + 進捗ハート表示
- reject フロー:
  1. キャラ「ん〜...もうちょっと仲良くなってからぁ」
  2. 進捗「・・・（あと 3 回ね）」（残数表示）
  3. 新選択肢グループ再表示
- 詳細実装: `src/game/GentleGalState.js` の `LOVE_MAX` / `canDoMain()` / `loveGaugeEmoji()`

---

## 必要画像素材一覧

> 第1作の素材生成プロンプトは [docs/ART_PROMPTS.md](./docs/ART_PROMPTS.md) 参照。
> 現在は SmartDoll #17 (GYARU archetype) からダミー流用済み（実生成は G016）。

全画面表示用キャラ画（webp）:

| ID | 用途 | 種別 | 数量 | パス |
|---|---|---|---|---|
| WAIT-01 | 待機画面 Stage 1 | 静止画 | 1 | `assets/images/wait/wait-stage1.webp` |
| WAIT-02 | 待機画面 Stage 2 | 静止画 | 1 | `assets/images/wait/wait-stage2.webp` |
| ACT-01 | 行為①ループアニメ | webpアニメ | 1 | `assets/images/act/act-01.webp` |
| ACT-02 | 行為②ループアニメ | webpアニメ | 1 | `assets/images/act/act-02.webp` |
| ACT-03 | 行為③ループアニメ | webpアニメ | 1 | `assets/images/act/act-03.webp` |
| FIN-01 | 行為①フィニッシュ | 静止画 or 短尺アニメ | 1 | `assets/images/finish/fin-01.webp` |
| FIN-02 | 行為②フィニッシュ | 静止画 or 短尺アニメ | 1 | `assets/images/finish/fin-02.webp` |
| FIN-03 | 行為③フィニッシュ | 静止画 or 短尺アニメ | 1 | `assets/images/finish/fin-03.webp` |

**合計: 8枚**（待機2枚 + 行為アニメ3本 + フィニッシュ3枚）

すべて全画面表示用。背景とキャラを分離せず、キャラ画そのものが画面全体を占める。

---

## 音声素材（ogg形式）

**ボイス（irodori採用）**:

| 用途 | 内容 | 備考 |
|---|---|---|
| 待機時セリフ Stage 1 | 象徴的セリフ（距離感あり） | 短く |
| 待機時セリフ Stage 2 | 象徴的セリフ（フランク） | 短く |
| 行為①象徴セリフ | 行為①特有 | ループ可 |
| 行為②象徴セリフ | 行為②特有 | ループ可 |
| 行為③象徴セリフ | 行為③特有 | ループ可 |
| フィニッシュ時セリフ | 共通 or 個別 | 短く |
| 未開放アイコン拒否セリフ | 「初回でいきなりはなし」系 | 1〜2パターン |

**収録方針**:
- irodori使用、象徴的セリフのみ厳選
- ogg書き出し（PC/Android対応）
- 吐息・喘ぎ系のループ音は別収録 or フリー素材

**BGM・SE**:

| ID | 用途 | 仕様 | パス |
|---|---|---|---|
| BGM-01 | 待機画面BGM | ambient、ループ | `assets/audio/bgm/bgm-wait.ogg` |
| BGM-02 | 行為シーンBGM | ambient、ループ | `assets/audio/bgm/bgm-act.ogg` |
| SE-01 | アイコンタップ音 | 短い | `assets/audio/se/se-tap.ogg` |
| SE-02 | 発射ボタン出現音 | 控えめ | `assets/audio/se/se-fire-appear.ogg` |

---

## 状態管理

```javascript
gameState = {
  affectionStage: 1,       // 1: 初回 / 2: 2回目以降
  menuUnlocked: [          // メニュー開放状況
    true, false, false
  ],
  completedActs: [         // 完了済み行為
    false, false, false
  ],
  currentScene: "waiting"  // "waiting" | "action" | "finish"
}
```

**永続化**:
- localStorage キー: `gentleGal.state.v1`
- リセットオプション（メニュー隠し配置 or 設定モーダル）

---

## 配布形式

### Android (APK)

| 項目 | 仕様 |
|---|---|
| 構成 | Capacitor + WebView |
| 解像度 | 1080×1920基準（縦持ち） |
| パッケージ名 | TBD（OPEN_QUESTIONS） |

### PC (Electron)

| 項目 | 仕様 |
|---|---|
| Electron | 最新安定版 |
| ウィンドウサイズ | 縦持ち推奨 |
| OS対応 | Windows / macOS |
| パッケージング | electron-builder |

### PWA

| 項目 | 仕様 |
|---|---|
| ホスティング | 自前VPS + 独自ドメイン（OPEN_QUESTIONS） |
| 用途 | 体験版（1メニュー限定） + 宣伝導線 |
| マニフェスト | manifest.json設定（ホーム画面追加対応） |
| Service Worker | オフライン対応 |

---

## 削除された仕様（実装しない）

- 累計訪問回数表示（正の字風視覚要素）
- 操作ヒント（キャラの微小発光エフェクト）
- ゲージ表示
- タイトル画面
- 言語切替UI
- 背景とキャラの分離（キャラ画＝全画面）
- 3段階以上の好意度（2段階のみ）
- ガチャ・トークン・衣装解放（SmartDoll由来、本作では削除）

---

## 制作スケジュール

| 週 | 作業 |
|---|---|
| Week 1 | キャラデザ確定、画面レイアウト設計、メニュー3種決定（OPEN_QUESTIONS の解消） |
| Week 2 | 静止画8枚生成、ループアニメ3本生成、TTS収録 |
| Week 3 | HTML5実装、PixiJS統合、状態管理、バブルUI |
| Week 4 | APK/Electron/PWAビルド、販売ページ準備、DLsite申請 |
