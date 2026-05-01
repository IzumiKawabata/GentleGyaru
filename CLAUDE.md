# Gentle Gal PROJECT

> **📜 起動時に最初に読む**: `D:\PlanetIP\PHILOSOPHY.md`（全社思想・運用原則・3モード）
>
> 必読順: **PHILOSOPHY.md → `Gentle-Gal/TASKS.md`（自部門の実行Queue）** → 本CLAUDE.md → `SPEC.md`（実装仕様 v1.1） → `OPEN_QUESTIONS.md`（未確定事項）
>
> **ルール**:
> - PHILOSOPHY.md と本ファイルが矛盾した場合、**PHILOSOPHY.md が勝つ**
> - 作業は必ず **`Gentle-Gal/TASKS.md`** の上から拾う。完了したら `Gentle-Gal/DONE.md` へ移動
> - 番号は **G001 / G002 / ...** の3桁連番
> - 他部門（HapRoom/easy/PlanetCat/SmartDoll）のフォルダは触らない
> - 経営判断や全社ルールは `PHILOSOPHY.md` 以外に書かない。Izumi 発話は `D:\PlanetIP\LOG.md`、ブレスト議題は `D:\PlanetIP\QUEUE.md`
> - ⚠️ **PHILOSOPHY.md §3 部門責任表への「Gentle-Gal」追加は未対応**。Izumi 本人の判断で実施予定

## 📜 行動ログ規約（完了タスク・必須）

G番号タスクを完了したら `Gentle-Gal/DONE.md` に上から新しい順に追記:

- フォーマット: `### G0XX — タスク名 ✅ YYYY-MM-DD`、成果物パス・検証結果・所要時間
- 同時に `D:\PlanetIP\LOG.md` に1行ログ（例: `- **[#創作 #Gentle-Gal #実行]** G005 WaitingScene 実装完了 → src/scenes/WaitingScene.js`）

---

## プロジェクト概要

**Gentle Gal（やさしいギャル）** は **Gentle シリーズ #1**。SmartDoll（30体マルチキャラPWA）から派生した別名義新シリーズの第1作で、**単体キャラ・メニュー3種・好意度2段階・ループ構造・完全ノンバーバル**に削ぎ落とした成人向け作品。

| 項目 | 内容 |
|---|---|
| シリーズ番号 | Gentle Series #1 |
| 想定制作期間 | 3〜4週間 |
| 想定価格 | 880〜1,320円（OPEN_QUESTIONS） |
| 制作者名義 | 別名義（メインライン完全分離・名義TBD） |
| 配布 | DLsite最優先 → itch.io → PWA → Nutaku（将来） |
| 形式 | Capacitor APK / Electron PC / PWA |

## 5原則

1. **完全ノンバーバル** — 絵文字・アイコン優先。テキストは必要最低限
2. **ループ構造** — メニュー → 行為 → フィニッシュ → メニュー帰還
3. **キャラ画一点集中** — 背景とキャラを分離せず、キャラ画＝全画面
4. **別名義分離** — フォルダ・パッケージ名・localStorage namespace・ストアフロントすべて SmartDoll と独立
5. **シリーズ統一フォーマット** — Gentle Maid/Nurse/Wife... は本作のシステムを継承、キャラと画像差し替えで量産

## シリーズ核哲学：受容と優しさ

Gentle シリーズ全9作の芯は **受容と優しさ**（memory: `project_gentle_philosophy.md`）。

- セリフ・態度・選択の応答すべてを「受容と優しさ」起点で書く
- 開始: 「どう...かな？」（様子伺い）+ 気遣いひとこと の2段
- 拒否: 拒絶ではなく「もうちょい仲良くなってからね」の含み
- 余韻: 突き放しではなく「ね、もうちょい一緒にいよ」の連続感
- 禁止トーン: 征服感、ヤラセル感、所有/支配文脈
- 推奨トーン: 受け止める、待つ、焦らない、一緒に、大丈夫

## SmartDoll との差分

SmartDoll のコード基盤を流用するが、以下を**削除**:

- ガチャ機構（gachaTokens, GACHA_TOKEN_COST, GACHA_POOL）
- 日替わり無料枠（UTC日付ベース）
- 衣装解放（casual/cosplay 切替）
- Patreon 連携（refreshEntitlement, hasPremiumUnlockAll）
- 30体キャラ管理（CHARACTERS 配列）
- メリーゴーランドUI

**残す**: EventBus / AudioEngine / SecureAssetLoader / AudioManager / EffortVoice / BubbleHelper / EmoteAnimation / hapticsBridge / Vite カスタムプラグイン構成。

**新規実装**: WaitingScene（待機キャラ画+バブルUI+メニュー3アイコン）/ ActionScene（ループアニメ+発射タップ）/ FinishScene。

## 技術スタック

- **描画**: Pixi.js 8.x
- **ビルド**: Vite 5.x + カスタムプラグイン4種（copyAssets / optimizeImages / encryptAssets / bustSwCache）
- **フレームワーク無し**: Vanilla JS（ES Modules）
- **PWA**: `public/manifest.json` + `public/sw.js`
- **音声**: Web Audio API（ogg）
- **画像**: WebP（静止画・アニメーション両用）
- **触覚**: Web Vibration API（hapticsBridge）
- **パッケージング**: Capacitor（APK）/ electron-builder（PC）
- **タイポグラフィ**: Inter（Latin/UI）+ Zen Kaku Gothic New（日本語）+ Noto Color Emoji（絵文字）
- **デザイントークン**: `src/styles/tokens.css` の `--accent*` 4変数のみで全体テーマ置換可能（横展開対応）

### CSS構成

`src/styles/main.css` は @import エントリポイント。実体は以下に分割:

```
tokens.css → base.css → splash.css → layout.css → components.css → effects.css
```

詳細は [docs/DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md) を参照。
シリーズ横展開時は `tokens.css` の冒頭4変数のみ書き換える（[../SERIES.md](../SERIES.md) の量産チェックリスト参照）。

## 状態管理スキーマ

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

localStorage キー: `gentleGal.state.v1`（SmartDoll の `smartDoll.settings.v1` と衝突しない別 namespace）

## 開発コマンド

```bash
npm run dev              # Vite 開発サーバー（http://localhost:5175）
npm run build            # プロダクションビルド（dist/）
npm run preview          # ビルド結果プレビュー（port 4174）
```

## 重要な未確定事項

`OPEN_QUESTIONS.md` 参照。実装前に確定が必要:
1. ギャルキャラのビジュアル方針
2. メニュー3種の具体決定
3. 発射タップ出現タイミング（30秒/60秒）
4. 未開放アイコン拒否時のキャラ反応
5. irodori 収録セリフリスト
6. PWA ドメイン
7. PWA 体験版の解放範囲
8. 販売価格
9. **Capacitor パッケージ名（別名義）**
10. **クリエイター名義（DLsite販売名義）**

---

## v1 スコープ外

- タイトル画面（仕様で削除済み）
- 言語切替UI
- 累計訪問回数表示
- ゲージ表示
- 操作ヒント
- 3段階以上の好意度（2段階のみ）

## v2 以降の検討

- シリーズ親仕様 `../SERIES.md` ✅（G018 で作成済み）。第3作以降はこの仕様＋ DESIGN_SYSTEM.md を踏襲

## 横展開（Gentle-Friend / Maid / ...）

第2作以降の量産は `../SERIES.md` の「量産チェックリスト」に従う。要点:

1. `Gentle-Gal` をフォルダごとコピー
2. 命名規則表（package / port / appId / localStorage / Heroine変数 / タスク番号prefix）に従って置換
3. **`src/styles/tokens.css` 冒頭の `--accent*` 4変数のみ** をキャラ themeColor に書き換え
4. ヒロイン素材（テキストプール / 画像 / 音声 / ロゴ下段の slug 文字列）差し替え
5. PWA manifest（name / theme_color / icons）更新

UI見た目をシリーズ全作で揃えるため、`--accent*` 以外のトークン（ink / paper / line / typography / spacing / radius / motion）は触らない。
- 通知機能 / 季節変化 / 記憶機能などはシリーズ全体で検討
