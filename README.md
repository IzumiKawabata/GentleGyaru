# Gentle Gal

**Gentle Series #1** — やさしいギャル。単体キャラ・メニュー3種・好意度2段階・ループ構造・完全ノンバーバルの成人向け作品。

## 最短ワークフロー

```bash
cd D:\PlanetIP\Gentle\Gentle-Gal
npm install
npm run dev    # http://localhost:5175
```

## ドキュメント

- [CLAUDE.md](./CLAUDE.md) — 部門憲章・実装規範・5原則
- [SPEC.md](./SPEC.md) — 実装仕様 v1.1（画面フロー・好意度・素材一覧）
- [TASKS.md](./TASKS.md) — G001〜 タスクキュー
- [DONE.md](./DONE.md) — 完了タスクログ
- [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md) — 未確定10項目

## ビルドターゲット

| ターゲット | コマンド | 出力 |
|---|---|---|
| Web (Vite dev) | `npm run dev` | http://localhost:5175 |
| PWA (本番ビルド) | `npm run build` | `dist/` |
| プレビュー | `npm run preview` | http://localhost:4174 |
| Android APK | `npx cap sync && npx cap open android` | Capacitor経由（要セットアップ G002） |
| PC Electron | `npm run electron:build` | electron-builder（要セットアップ G003） |

## アセット格納パス早見表

| ID | 用途 | パス |
|---|---|---|
| WAIT-01 | 待機画面 Stage 1 | `assets/images/wait/wait-stage1.webp` |
| WAIT-02 | 待機画面 Stage 2 | `assets/images/wait/wait-stage2.webp` |
| ACT-01〜03 | 行為①〜③ループアニメ | `assets/images/act/act-NN.webp` |
| FIN-01〜03 | フィニッシュ①〜③ | `assets/images/finish/fin-NN.webp` |
| Voice | irodori象徴セリフ | `assets/audio/voice/*.ogg` |
| BGM | 待機/行為BGM | `assets/audio/bgm/bgm-{wait\|act}.ogg` |
| SE | タップ音・発射出現音 | `assets/audio/se/se-{tap\|fire-appear}.ogg` |

## ディレクトリ構造

```
Gentle-Gal/
├── CLAUDE.md / README.md / SPEC.md / TASKS.md / DONE.md / OPEN_QUESTIONS.md
├── package.json / vite.config.js / capacitor.config.ts / index.html
├── src/
│   ├── main.js
│   ├── app/App.js              ← 3画面ルーター
│   ├── scenes/
│   │   ├── WaitingScene.js     ← 待機 + バブル + メニュー3
│   │   ├── ActionScene.js      ← ループアニメ + 発射タップ
│   │   └── FinishScene.js      ← フィニッシュ演出
│   ├── game/
│   │   ├── GentleGalCharacter.js  ← 単体キャラ・アセットパス
│   │   └── GentleGalState.js      ← 状態管理 + localStorage
│   ├── core/                   ← SmartDoll 流用（EventBus / AudioEngine / SecureAssetLoader / MediaPreloader）
│   ├── audio/                  ← SmartDoll 流用（AudioManager / EffortVoice）
│   ├── ui/                     ← SmartDoll 流用（BubbleHelper）
│   ├── utils/                  ← SmartDoll 流用（dom / math / hapticsBridge）
│   └── styles/main.css
├── assets/                     ← 制作中（プレースホルダーで起動可能）
└── public/
    ├── manifest.json
    ├── sw.js
    └── icons/                  ← G004 で配置
```

## 関連プロジェクト

- 親: `D:\PlanetIP\Gentle\` — シリーズ親フォルダ（共通仕様は #2 着手時に追加）
- 流用元: `D:\PlanetIP\SmartDoll\` — 30体マルチキャラPWA（コード参照のみ、変更しない）
- 全社: `D:\PlanetIP\PHILOSOPHY.md` — ⚠️ §3 部門責任表への Gentle-Gal 追加が未対応
