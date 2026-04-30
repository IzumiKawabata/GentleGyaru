# Gentle Gal — DONE

> 完了タスクを上から新しい順に積む。
> フォーマット: `### G0XX — タスク名 ✅ YYYY-MM-DD`、成果物パス・検証結果・所要時間

---

### Iteration 2026-04-30 (#11) — プレイ中ゲージ非表示 / Fire promptをメッセージ駆動 ✅ 2026-04-30

**プレイ中は愛情ゲージ非表示**:
- CSS `.app[data-route="action"] .love-gauge, .app[data-route="finish"] .love-gauge` で opacity:0
- 没入感優先（プレイ中は数値指標を見せない）
- waiting に戻った時に再表示

**Fire/Keep prompt をメッセージ駆動に**:
- `FIRE_PROMPT_MS = 7000` 固定タイマー廃止
- `FIRE_PROMPT_AFTER_BUBBLE2_MS = 1800` を `_showStartBubble2()` 内で発火
- 開始セリフ②「いきたくなったら...いつでもいいからね」が出てから自然な間（1.8s）で prompt 表示
- 「セリフが終わってから次のアクション」という会話駆動のリズムに統一
- Keep 後の3言→prompt も既にメッセージ駆動なので一貫性確保

**検証**:
- 起動時: route=waiting, love-gauge opacity=1
- メニュー選択後 action 遷移: opacity=0（自動非表示）
- 開始セリフ② から 1.8s 後に「🔥 Fire / Keep」表示確認

**愛情増減ロジックは現状で固定（Izumi 同意）**:
- ロジックはシンプルに、表現は豊かに
- gain 別の余韻セリフ（AFTERGLOW_RUSHED / AFTERGLOW_PATIENT / 標準）で温度差表現
- 数値ゲーム化はせず、セリフプール分岐で深化させる方向

### Iteration 2026-04-30 (#10) — 内容×タイミング愛情増減 / Keep 3言ループ / 白背景ボタン / ミニマル化 ✅ 2026-04-30

**愛情ゲージ増減ロジック（calcLoveGain）**:
- ACT-03 (本番): +0（既に MAX 必須なので加点なし）
- 早 Fire（Keep 0回）: +0（焦らさず即発射 → 加点なし）
- 標準（Keep 1-2回）: +1
- 焦らしボーナス（Keep 3回以上）: +2
- 強要 reject (gauge<MAX で本番タップ): -1（既存 recordMainReject）

**Keep 3言ループ**:
- 自動メッセージ（AUTO_BUBBLE）廃止: 選択肢出ている間はバブル流れない
- Keep タップ → 3言ランダムピック（pickThreeUnique）→ 1.5s 間隔で順次表示 → 1.7s 後に新 Fire/Keep prompt
- KEEP_REPLIES_POOL を ACT-01/02/03 別に7語ずつに拡張

**FinishScene gain で出し分け**:
- gain >= 2: AFTERGLOW_PATIENT「ありがと、ゆっくり付き合ってくれて」「焦らせなくて、嬉しい」
- gain === 0 かつ keepCount === 0: AFTERGLOW_RUSHED「えっ、もう？早かったね？」
- 標準: AFTERGLOW_1_BUBBLES（既存）

**UI ミニマル化（Izumi 2026-04-30 指示）**:
- 選択肢ボタン: 透明白枠 → **白背景 `rgba(255,255,255,0.92)` + 黒文字**、影で浮き感
- ACT-03 ラベルから loveGauge 進捗（・・・ 表示）削除 → シンプルに「💞 本番で」固定
- 本番 reject 時の進捗バブル「あと×回」削除 → reject セリフのみ
- ゲージ可視化は左上の love-gauge UI に集約

**ActionScene bubble-track 位置同一化**:
- `bottom: 11vh → 0` で WaitingScene と同じ位置

**検証**:
- 起動: 「✋ 手で / 💋 口で / 💞 本番で」（白背景・黒文字、ゲージ表示なし）
- 本番タップ: ゲージ -1、「ん〜...もうちょっと仲良くなってからぁ」のみ（進捗バブルなし）
- Keep タップ: 「ふふっ、焦らないで」「いつでも、出していいよ」「まだ？...じゃ、もう少し」（ランダム3言）
- gain ロジック: 早=0, 1-2Keep=1, 3+Keep=2, 本番=0

### Iteration 2026-04-30 (#9) — ナンバリング廃止 / アクセント塗り / 自動メッセージ / 愛情ゲージUI / 強要ペナルティ / 起動時2セリフ ✅ 2026-04-30

**選択肢ナンバリング削除**:
- WaitingScene の `pushChoices` に `variant: 'actions'` 渡す → 番号非表示、絵文字のみ

**選択後のバブルがアクセント塗り**:
- `keepOnly` で残った要素に `data-chosen="true"`
- CSS `.choice-bubble[data-chosen="true"]`: `var(--accent)` 背景・accent-text 文字色・実線縁

**選択肢の右詰めアニメ**:
- `.choice-bubble--vanish` に `max-width: 0; padding: 0; margin: 0`
- 横にも縦にも折りたたまれて消える → 残った1つが flex-end で右に詰まる

**ActionScene 自動メッセージ（タップ不要）**:
- `AUTO_BUBBLE_INTERVAL_MS = 6500`、`AUTO_BUBBLE_INITIAL_DELAY_MS = 8500`
- タップなしでも一定間隔で PLAY_TAP_BUBBLES から発話 + voice
- Keep やシーン hide でリセット

**WaitingScene トランジションテンポ**:
- `TRANSITION_MS = 1000 → 2200`（エンディングのテンポ感に揃える）

**愛情ゲージUI 左上3個ハート**:
- index.html に `<div id="love-gauge">💗💗💗</div>` 追加
- 左上 fixed、glassmorphism 半透明黒、blur(10px)
- `data-filled="true"` で発色、`false` で grayscale + opacity 0.4
- finish 中は `[data-route="finish"]` で非表示
- `src/ui/LoveGaugeUI.js` の `renderLoveGauge(state)` 提供

**本番強要でゲージ低下**:
- `recordMainReject(state)` を GentleGalState に追加（`loveGauge = max(0, loveGauge - 1)`）
- ACT-03 reject 毎回 -1 ペナルティ
- バブル文言: 「無理に何回も...って言うの」（受容哲学の表現）

**起動時も2セリフ→選択肢（駛馬テンポ）**:
- WaitingScene 起動時を ActionScene と同じ流れに統一
- `GREETING_BUBBLES_1` 様子伺い + `GREETING_BUBBLES_2` 気遣い
- `AFTER_FINISH_GREETINGS_1/_2` 連続セッション用に分割
- タイミング: 0s greet1 / 1.0s greet2 / 2.0s choices（ActionScene の 2.1s/4.4s より速い）

**App.js ルート属性**:
- `_setRouteAttr()` で `<div id="app" data-route="waiting|action|finish">` を更新

**検証**:
- 起動: 「ふふっ、なんか緊張する〜」 + 「気楽にいこ？」 + ✋💋💞 choices
- gauge=2 で本番タップ: hearts `[true,true,false]` → `[true,false,false]` 即時減少
- chosen バブル背景: `rgba(169,200,230,0.62)` アクセント
- vanish: width 43px に圧縮、残った1つが右詰め

### Iteration 2026-04-30 (#8) — 入場暗転 / 開始セリフ2本(様子伺い+気遣い) / 横並び統一 / メニュー絵文字 / 受容と優しさ哲学 ✅ 2026-04-30

**プレイ開始時のゆっくり暗転（FinishScene の対称）**:
- `<div id="action-blackout">` 追加、CSS `transition: opacity 1.6s ease-out`
- ActionScene.show 時に `data-active="true"` (opacity=1) → 50ms後に `false` (1.6sフェード)
- 「目を閉じて開けたら始まってる」感

**開始セリフ2本（受容と優しさの哲学）**:
- ① `2.1s` 様子伺い: 「どう...かな？」「緊張してる？」「...大丈夫そう？」
- ② `4.4s` 優しいひとこと: 「いきたくなったら...いつでもいいからね」「力加減、大丈夫かな？あんまり慣れてないからさ...」「無理しないで、ゆっくりで」
- メニュー別に3パターン × 3メニュー = 18セリフ
- ACT-03 は気遣いトーン強め「痛かったら、止めるからね？」

**ActionScene バブル max=3**:
- 開始セリフ① + 開始セリフ② + Fire/Keep prompt = 3 が同時に見える
- Keep 押すと反応バブル追加で1つ trim → 直近1ラリー保持

**選択肢レイアウト統一（Waiting/Action 共通）**:
- `.choice-group` ベースを `flex-direction: row; flex-wrap: wrap; justify-content: flex-end`
- 「✋ 手で / 💋 口で」が横並び、3つ目「💞 本番で ・・・」は折り返し（多い場合は複数行可）
- Fire/Keep も同じレイアウトベース、`.choice-group--actions` で番号だけ消す違い

**メニュー選択肢絵文字（ノンバーバル原則）**:
- 1. ✋ 手で
- 2. 💩 口で → 修正: 💋 口で
- 3. 💞 本番で ・・・（gauge 0時）/ 💞 本番で（MAX時）

**Gentleシリーズ核哲学「受容と優しさ」（memory 永続化）**:
- `~/.claude/projects/D--PlanetIP/memory/project_gentle_philosophy.md` 追加
- MEMORY.md インデックス更新
- 全9作共通の芯。征服感ではなく受容・気遣い・連続セッション感
- 開始（様子伺い+気遣い）/ 拒否（含み）/ 余韻（連続感） すべてこの軸で書く

**Fire/Keep prompt タイミング調整**:
- `FIRE_PROMPT_MS = 5_000 → 7_000`（開始セリフ2本を見せきってから prompt）

**検証結果**:
- 0s: blackout opacity=1
- 1s: opacity=0.22（フェード途中）
- 2.3s: opacity=0、「どう...かな？」表示
- 4.5s: 「いきたくなったら...いつでもいいからね」追加表示
- 7s: 🔥 Fire / Keep prompt 表示
- 選択肢横並び確認: 1✋手で・2💋口で が同行、3💞本番で・・・ が次行（flex-wrap）

### Iteration 2026-04-30 (#7) — Action 入場暗転 + 開始セリフ + 1ラリー表示 ✅ 2026-04-30

**プレイ開始時のゆっくり暗転（FinishScene の対称）**:
- `<div id="action-blackout">` を action-scene に追加
- CSS `transition: opacity 1.6s ease-out`
- ActionScene.show 時に `data-active="true"` (opacity=1) → 50ms後に `false` (フェードアウト開始)
- 「目を閉じて開けたら始まってる」感を演出

**暗転明け後に開始セリフ**:
- `ACTION_START_BUBBLE_MS = 2_100` 後にメニュー別 START_BUBBLES から1本表示
- ACT-01: 「んっ...じゃ、はじめるね」「はい、おとなしくしてて〜」「ふふっ、いくよ？」
- ACT-02: 「口つけてもいい...？」「はい、目つぶってて」「はぁ...味わって、ね」
- ACT-03: 「いい？...本気でいくよ」「もう、わたしのこと忘れちゃダメだよ」「いっぱい、しよ？」

**ActionScene バブル max=2（1ラリー分）**:
- 直近の choice-group + キャラ反応（または開始セリフ + Fire/Keep prompt）が見える
- 古い 2 ラリー前のバブルは自動 trim
- 開始セリフ（t=2.1s）は Fire/Keep prompt（t=5s）と同居して見える

**フェーズタイミング**:
```
0.0s   action 入場、blackout opacity=1
0.05s  blackout フェードアウト開始
1.65s  blackout opacity=0
2.1s   開始セリフ表示
5.0s   🔥 Fire / Keep prompt
```

**検証結果**:
- 0s: blackout opacity=1 完全暗転
- 1s: opacity=0.22 フェード途中
- 2.3s: opacity=0、「んっ...じゃ、はじめるね」表示
- 5.2s: 開始セリフ + Fire/Keep（max=2 で1ラリー分）
- Keep後: choice + 反応「まだ？...じゃ、もう少し付き合ってあげる」

### Iteration 2026-04-30 (#6) — 愛情ゲージ / Fire-Keep / 枠線ボタン / 白文字バブル ✅ 2026-04-30

**愛情ゲージ システム** (新規):
- `state.loveGauge: 0..LOVE_MAX(=3)` 追加、recordFinish で +1 累積
- `state.menuUnlocked` の意味変更: 全メニュー常時 `true`（lock UI 廃止）
- ACT-03（本番）は `conditional`: 押せるが loveGauge < MAX で reject
- reject 時のフロー:
  1. 「ん〜...もうちょっと仲良くなってからぁ」
  2. 進捗バブル「・・・（あと 3 回ね）」（loveGaugeEmoji `'💗'.repeat(v) + '・'.repeat(MAX - v)`）
  3. 1.1秒後に新選択肢グループ再表示
- ACT-03 ラベル: 未MAX「本番で ・・・」/ MAX「本番で 💗」

**Fire/Keep choice 化**:
- ActionScene の単独 `<button id="fire-btn">` 廃止
- 5秒後に bubble-track 内に choice-group「🔥 Fire / Keep」表示
- Fire: finish 遷移
- Keep: keepOnly でアニメーション → キャラ反応（KEEP_REPLIES「まだ？...じゃ、もう少し付き合ってあげる」等）→ 7秒後に再 prompt
- play中タップ（キャラ画タップ）も継続。任意で会話できる

**ChatBubbles 拡張**:
- `pushChoices(items, onPick, opts)` に `variant: 'numbered' | 'actions'` 追加
- 'actions' は横並び・番号なし（Fire/Keep 用）
- `item.conditional` で破線枠表示
- `item.icon` で先頭アイコン（🔥 等）

**選択肢ボタン枠線スタイル化**:
- 透明背景 + 白枠 `border: 1.5px solid rgba(255,255,255,0.7)`
- 角丸ピル `border-radius: 999px`
- 白文字 + text-shadow で背景透けても可読
- 押下時にアクセント色がフラッシュ
- 条件付きは破線枠（`border-style: dashed`）

**メッセージバブル白文字化**:
- 全 chat-bubble: `color: #fff` + `text-shadow: 0 1px 3px rgba(0,0,0,0.55)`
- キャラバブル背景: `rgba(0,0,0,0.28)` 薄黒透過
- プレイヤーバブル背景: `rgba(169,200,230,0.32)` アクセント半透明
- backdrop-filter: blur(10px)

**検証結果（serverId 7377d7a3）**:
- 初期: loveGauge=0、選択肢「1.手で / 2.口で / 3.本番で ・・・」（3が破線条件付き）
- 本番タップ → 「ん〜...もうちょっと仲良くなってからぁ」→ 「・・・（あと 3 回ね）」 → 新選択肢
- 3回 recordFinish 後: loveGauge=3、選択肢「3.本番で 💗」（条件解除、普通の枠線）
- 本番タップ → `act-03.webp` 遷移成功
- ActionScene: 5秒後に「🔥Fire / Keep」表示、Keep→「まだ？...」→7秒後再 prompt → Fire で finish 遷移

### Iteration 2026-04-30 (#5) — 透け感バブル / heroine別アクセント / 余韻拡張 / 連続セッション感 ✅ 2026-04-30

**アクセントカラーをheroine別に**:
- `--accent` を Gentle Gal 黄色 → **MIKU 薄ブルー `#a9c8e6`** に変更（heroine themeColor連動）
- CSS変数: `--accent` (半透明 rgba), `--accent-solid`, `--accent-text`, `--accent-border`
- シリーズ#2 以降は `--accent` 1行差し替えで対応可能

**透け感バブル（フロステッドガラス）**:
- すべてのバブル/選択肢/FIRE に `backdrop-filter: blur(14px) saturate(160%)`
- キャラバブル: `rgba(255,255,255,0.55)` + 白縁
- プレイヤーバブル: `rgba(169,200,230,0.62)` + アクセント縁
- 選択肢: 白半透明 + 黒枠（ロック時は破線）
- 影は `0 4px 18px rgba(0,0,0,0.08)` で軽く

**選択後の選択肢非表示**:
- ChatBubbles に `keepOnly(group, idx)` 追加
- 選んだ idx 以外の choice-bubble に `.choice-bubble--vanish` 付与
- CSS animation: max-height/padding/border 0 → 折りたたみで自然消失（450ms）
- WaitingScene `_handleAccept` / `_handleReject` どちらも keepOnly を呼び、選んだもの「1. 手で」だけ履歴に残る

**ActionScene play中バブル max=1**:
- `new ChatBubbles(elem, { max: 1 })` に変更
- 連続タップでバブルが入れ替わる（重ならない）
- 噛みしめる時間が増える

**FinishScene 余韻拡張 (6s → 13s)**:
- `FINISH_AFTERGLOW_1_MS = 1600`: 余韻セリフ① 即座の反応「ふぅ...指つかれた？」
- `FINISH_AFTERGLOW_2_MS = 5200`: 余韻セリフ② 噛みしめる「ネイル汚しちゃった、ま、また塗ればいっか」
- `FINISH_PROMISE_MS = 8400`: 約束「ね、もうちょい一緒にいよ」「次は何しよっか」
- `FINISH_BLACKOUT_MS = 11000`: deep-blackout 開始（2秒で完全暗転）
- `FINISH_DURATION_MS = 13000`: finish:complete
- finish-bubbles も max=1 で噛みしめる時間確保

**「翌日朝」廃止 → 「まだする？」連続セッション感**:
- App.js の nextDay フラグ → `afterFinish` にリネーム
- WaitingScene の NEXT_DAY_GREETINGS → AFTER_FINISH_GREETINGS に置換
  - 「ふぅ...まだする？」「まだ余裕じゃん？...次どうする？」「もう一個いっとく？」「ね、もうちょい付き合ってよ」
- 時間経過なし、その場で連続して関係続く流れ

**検証**:
- 選択肢タップ → 200ms で `vanish: [false, true, true]`
- 800ms で視覚的に残るのは選んだ「1.手で」のみ
- play中タップ x2 → actionBubbleCount = 1
- finish 13s フロー: 1.6s afterglow1 → 5.2s afterglow2 → 8.4s promise → 11s blackout → 13s waiting (afterFinish 挨拶「もう一個いっとく？」)

### Iteration 2026-04-29 (#4) — 白黒ミニマル / 1ラリー会話 / Fire後の余韻+約束+深ブラックアウト ✅ 2026-04-29

**画像差し替え**:
- SD #02 RINA → **SD #01 MIKU (gentle-shy)** に再差し替え（黒髪、はにかみ笑顔、キャラ性が「やさしい」と整合）

**CSS 全面再設計**:
- 白黒ミニマル化（クリーム色廃止 → 純白 `#fff` + 黒 `#111`）
- アクセントカラーを CSS 変数化 (`--accent: #ffea4f`)、キャラ別差し替え可能
- プレイヤーバブル → 黄色アクセント、キャラバブル → 白カード+黒枠
- 選択肢ボタン → 黒枠+ナンバリング、ロック時は破線+🔒
- 画面下部: 眩しい白フェード → **薄い黒透過**（`rgba(0,0,0,0~0.55)` グラデ）で可読性UP

**1ラリー会話システム** (チャット内選択肢):
- `choice-track` 廃止 → `bubble-track` 一本化
- ChatBubbles に `pushChoices(items, onPick)` / `markChoicesSpent(group)` 追加
- 選択肢グループはチャット履歴の流れに右寄せで挿入される
- 選択後は spent でグレーアウト、プレイヤー発話 → キャラ応答 → 次選択肢が積まれる
- index.html から `<div class="menu-bar">` 廃止

**選択肢ナンバリング**:
- `1.` `2.` `3.` を `<span class="choice-num">` で個別span化（tnum 数字）
- ロック時は 🔒 アイコン併記

**FinishScene 4フェーズ演出** (`FINISH_DURATION_MS = 6000`):
1. `0.0s` フィニッシュ画像 + flash + vignette
2. `1.0s` 余韻セリフ（メニュー別 AFTERGLOW_BUBBLES）
3. `2.6s` 最下位の約束（PROMISE_BUBBLES）「また明日も来てよ」「次はいつ会える？」
4. `4.4s` deep-blackout フェードイン（1.6秒で完全暗転）
5. `6.0s` finish:complete 発火

**翌日朝モード**:
- App が `bus.on('finish:complete')` で `_gotoWaiting({ nextDay: true })` を発火
- WaitingScene.show({ nextDay: true }) が NEXT_DAY_GREETINGS から挨拶選択
- 「おはよ〜。昨日はありがと？」「よく眠れた？...って、また会いに来ちゃってさ」
- 翌日感は1回のみ、その後の遷移は通常 Stage 2 挨拶

**検証**:
- viewport 425×658 でMIKU実画像表示、白ベース、選択肢「1. 手で」「2. 🔒 口で」「3. 🔒 本番で」、可読性OK
- 1ラリー: キャラ発話→選択肢→（タップ）→spentグレーアウト→プレイヤー発話→キャラOK→1秒余韻→action

### Iteration 2026-04-29 (#3) — 白ベース×チャットアプリ風UI + 選択肢バブル化 + 1秒トランジション ✅ 2026-04-29

- **画像差し替え**: SD #17 (GYARU パッケージ風プレースホルダー 230KB) → **SD #02 (RINA cheerful 実画像 800KB-1.2MB)** に8枚全部差し替え
- **CSS 全面リデザイン (`src/styles/main.css`)**:
  - 背景 `#1a1a1a` 黒 → `#f5f0ea` クリーム白
  - キャラ画下端を `linear-gradient` で白へフェード（バブルが乗る領域は白に溶ける）
  - 通常 chat-bubble: 白カード + 影、プレイヤーは柔らかいオレンジ `#ffd28a`
  - choice-bubble 新設: オレンジ枠 `#ffb74c`、ロック時は🔒アイコン+グレー
  - fire-bubble 新設: ピンク `#ff6b8e` の丸み、`もう、いっちゃう` テキスト
  - LINE/iMessage 風の親しみやすさ
- **メニューアイコン廃止 → 選択肢バブル**:
  - `.menu-icon` (3つの円形ボタン) を削除
  - `.choice-bubble` × 3（「手で」「口で」「本番で」）に置換
  - WaitingScene が `_renderChoices()` で動的生成
- **1秒トランジション** (`TRANSITION_MS = 1000`):
  - 開放選択時: プレイヤーバブル即時 → 280ms 後にキャラ「OK系」バブル → 1000ms 余韻 → ActionScene 遷移
  - ACCEPT_BUBBLES プール × 3メニュー × 3候補（「やさしくしてあげる」「リップ落ちちゃうけど、ま、いっか」「もう、しょうがないな〜」等）
  - `_transitioning` フラグで連打抑制
- **REJECT_BUBBLES** 1パターン追加（計3パターン）
- **検証**:
  - リセット → 「よろしく〜。なに、緊張してる？」表示
  - 「手で」タップ → 100ms「手でお願い」→ 450ms「やさしくしてあげる」→ 1550ms action（act-01.webp）
  - 視覚: ピンクヘア実画像、白ベース、選択肢バブル3つ、🔒口で・🔒本番で
- **SPEC.md WaitingScene セクション更新**

### Iteration 2026-04-29 (#2) — 仕様調整 + ダミーアセット投入 ✅ 2026-04-29

- **FIRE_TAP_FADE_IN_MS = 60_000 → 5_000**（Izumi 指示、play中バブル追加で待ち時間短縮の妥当性確保）
- **SmartDoll #17 (GYARU archetype) からダミー流用**:
  - 画像 8枚: SD #17 casual/cosplay の profile/foreplay/play/cumshot を Gentle Gal のパス規約にコピー
  - 音声 voice 10本: rina (cheerful) の sigh/laugh/pant/moan/climax/gasp を流用、Gentle Gal の名前にrename
  - SE 2本: door-chime.mp3 → se-tap、splash.mp3 → se-fire-appear
  - BGM はSmartDoll に無いので未配置（GentleAudio が `null` を黙殺）
- **GentleGalCharacter VOICE_FILES/SE_FILES 拡張子調整**: ogg → wav/mp3
- **play中バブル機能追加**:
  - `src/ui/ChatBubbles.js` 新規（WaitingScene と共有ユーティリティ）
  - ActionScene にキャラ画タップゾーン + バブル track 追加
  - メニュー進行（0/1/2）に応じた発話プール、TAP_COOLDOWN_MS=800 で連打抑制
  - voice はランダム3種から選択（PLAY_TAP_01/02/03）
  - WaitingScene 側も ChatBubbles に置換、`_pushBubble`/`_clearBubbles` を削除
- **CSS 追加**: `.action-tap-zone` `.bubble-track--action`
- **ART_PROMPTS.md** 新設: 就活スーツのギャルコンセプト、ネガ/共通/各シーンプロンプト、着崩れ段階表
- **OPEN_QUESTIONS #1/#2/#3 解消**
- 検証: 待機 → メニュー① → action（act-01.webp）→ play中タップ3回 → 5秒後 FIRE出現 → 動作OK
- アセット fetch: 全部 200 OK（画像 232KB / voice 242KB / SE 18KB）

### G005-G009 — Phase 2 コア実装（WaitingScene/ActionScene/FinishScene/拒否反応/永続化）✅ 2026-04-29

- WaitingScene: `src/scenes/WaitingScene.js` — 待機キャラ画フル表示、独自 chat-bubble UI、メニュー3アイコン、開放/未開放（opacity 0.45）、リセット隠しボタン（ダブルタップ）
- ActionScene: `src/scenes/ActionScene.js` — ループアニメ表示、`FIRE_TAP_FADE_IN_MS = 60000` 後に発射ボタンフェードイン、行為象徴 voice ループ、BGM-ACT 切替
- FinishScene: `src/scenes/FinishScene.js` — `FINISH_DURATION_MS = 4000`、CSS finish-flash + vignette pulse、自動帰還
- 拒否バブル: 2 パターンローテ + voice REJECT_LOCKED 再生
- 永続化: `gentleGal.state.v1` localStorage キー（SmartDoll の `smartDoll.settings.v1` と分離）、ダブルタップでリセット
- 検証: E2E フロー（waiting Stage1 → action act-01 → finish fin-01 → waiting Stage2）プレビューでパス、メニュー②③ロック状態、404 なし

### G010 — ParticleLayer 採用見送り ✅ 2026-04-29

- SmartDoll 流用コードは `src/effects/ParticleLayer.js` に保管（将来再採用可能）
- 第1作では CSS finish-flash + vignette pulse で代替
- シリーズ統一フォーマットの軽量性志向と合致

### G003 — Electron 依存追加 ✅ 2026-04-29

- `electron` ^41.3.0 / `electron-builder` ^26.8.1 インストール（234 packages）
- `electron/main.cjs` 作成（縦持ち 540×960、context isolation、VITE_DEV_SERVER_URL 切替対応）
- `package.json` scripts: `electron:dev` `electron:build` `electron:build:win` `electron:build:mac`
- electron-builder config: appId `com.gentlegal.app`、win nsis+portable、mac dmg
- ⚠️ 実 OS での起動検証は G012 で実施

### G002 — Capacitor 依存追加 ✅ 2026-04-29

- `@capacitor/core` `@capacitor/cli` `@capacitor/android` インストール（91 packages）
- `package.json` scripts: `cap:sync` `cap:android`
- `capacitor.config.ts` 暫定値 `com.gentlegal.app`（OPEN_QUESTIONS #9 で別名義決定後に上書き）
- ⚠️ `npx cap add android` は Android Studio 必要なので G011 で実施

### G004 — アセット枠（プレースホルダー）配置 ✅ 2026-04-29

- `scripts/generate-placeholders.mjs` 作成、`npm run generate:placeholders` で再生成可能
- 11 ファイル生成:
  - 8枚プレースホルダー画像（radial gradient + 絵文字 + ラベル）
  - 3枚 PWA アイコン（icon-192/512/maskable-512）
- 音声プレースホルダーは未配置（OPEN_QUESTIONS #5 irodori 収録待ち）
- GentleAudio が fetch 失敗を黙殺する設計（`_safe` ラッパー）→ 音声ファイル無くても動作

### G001 — 依存インストール & dev起動検証 ✅ 2026-04-29

- `npm install` で 28 packages 追加（pixi.js, vite, sharp）
- `npm run dev` で http://localhost:5175 起動成功
- ブラウザプレビューで E2E フロー全段確認
  - Boot → WaitingScene Stage 1 表示
  - メニュー②（未開放）タップ → 拒否バブル
  - メニュー①（開放）タップ → ActionScene 遷移、`act-01.webp` 参照
  - 強制 FIRE → FinishScene、Stage 1→2 昇格、completedActs[0]/menuUnlocked[1] 更新
  - 4秒後 → WaitingScene Stage 2 帰還、`wait-stage2.webp` 参照
  - localStorage に `gentleGal.state.v1` 永続化、`smartDoll.settings.v1` に影響なし

### G000 — プロジェクトスキャフォールド ✅ 2026-04-29

- 成果物: `D:\PlanetIP\Gentle\Gentle-Gal\` 配下の docs / build config / src 雛形 / assets フォルダ構造
- SmartDoll コードベースから流用（core / audio / ui / utils）+ 単体キャラ向け新規実装（scenes / game）
- 検証: dev起動・状態管理・シーン遷移確認済み
