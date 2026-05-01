# Gentle Gal — TASKS

> 上から順に拾う。完了したら `DONE.md` へ移動（新しい順に上に積む）。
> 番号は **G001〜G999** の3桁連番。

## 進捗サマリー（2026-04-29 更新）

| Phase | 状態 | タスク |
|---|---|---|
| Phase 1 セットアップ | ✅ 全完了 | G001 G002 G003 G004 |
| Phase 2 コア実装 | ✅ ほぼ完了 | G005 G006 G007 G008 G009 完了 / G010 保留 |
| Phase 3 ビルド配布 | ⏸ 待機中 | G011 G012 G013 G014（OPEN_QUESTIONS 待ち） |
| Phase アセット | ⏸ 待機中 | G015 G016 G017（OPEN_QUESTIONS / 別名義決定待ち） |

---

## 🔧 セットアップ・骨格（Phase 1）

### G001 ✅ — 依存インストール & dev起動検証
- `npm install` で 28 packages 追加
- `npm run dev` http://localhost:5175 起動確認
- E2E フロー（waiting → action → finish → waiting Stage 2）動作確認
- **DONE 2026-04-29**

### G002 ✅ — Capacitor 依存追加
- `@capacitor/core` `@capacitor/cli` `@capacitor/android` インストール（91 packages）
- `package.json` に `cap:sync` `cap:android` script 追加
- `capacitor.config.ts` 暫定値 `com.gentlegal.app`（OPEN_QUESTIONS #9 で別名義決定後に上書き）
- ⚠️ `npx cap add android` は Android Studio 必要なので未実行（G011 で実施）
- **DONE 2026-04-29**

### G003 ✅ — Electron 依存追加
- `electron` `electron-builder` インストール（234 packages）
- `electron/main.cjs` 作成（縦持ち 540×960、context isolation、devUrl 切替対応）
- `package.json` に `electron:dev` `electron:build` `electron:build:win` `electron:build:mac` script 追加
- electron-builder config 追加（appId / productName / files / win-nsis-portable / mac-dmg）
- ⚠️ 実際の `npm run electron:dev` 起動検証は OS 環境で要実施（G012）
- **DONE 2026-04-29**

### G004 ✅ — アセット枠（プレースホルダー）配置
- `scripts/generate-placeholders.mjs` で 11 ファイル生成
  - 8枚のプレースホルダー画像（radial gradient + テキスト/絵文字）
  - 3枚の PWA アイコン（icon-192/512/maskable-512）
- 音声プレースホルダーは未配置 → GentleAudio が fetch 失敗を黙殺設計（404 出てもフロー阻害なし）
- 実音声ファイル配置は OPEN_QUESTIONS #5 (irodori 収録) 解消待ち
- **DONE 2026-04-29**

---

## 🎮 コア実装（Phase 2）

### G005 ✅ — WaitingScene 仕上げ
- 待機キャラ画フル表示（affectionStage に応じて WAIT-01/WAIT-02 切替）
- 下部メニュー3アイコン配置
- 開放済み: フル表示 / 未開放: opacity 0.45
- 全アイコン押下可能、未開放タップ時は拒否バブル表示
- 独自 chat-bubble 実装（BubbleHelper はチャット形式に合わないため新設、左/右バブル）
- BGM-WAIT 開始、挨拶 voice 再生
- 検証: 開放メニュータップで ActionScene 遷移、未開放タップで拒否バブル＋voice
- **DONE**

### G006 ✅ — ActionScene 仕上げ
- ループアニメ表示、選択メニューに応じて ACT-01/02/03 切替
- 発射タップボタンを `FIRE_TAP_FADE_IN_MS = 60_000` 後にフェードイン
- BGM-ACT へ切替
- 行為象徴 voice ループ（ACT_01/02/03）
- 発射タップで FIRE_APPEAR SE → finish 遷移
- **DONE**

### G007 ✅ — FinishScene 仕上げ
- 静止画 or 短尺アニメ表示（FIN-01/02/03）
- CSS vignette pulse + finish-flash エフェクト
- 表示時間 4秒固定（FINISH_DURATION_MS）
- BGM 停止、フィニッシュ voice 再生
- 自動で WaitingScene 遷移、Stage 1→2 昇格、completedActs/menuUnlocked 更新
- **DONE**

### G008 ✅ — 未開放アイコンタップ時のキャラ反応
- 拒否バブル × 2パターン実装
- VOICE_FILES.REJECT_LOCKED 再生（ファイル未配置でも黙殺）
- 連打しても順番にローテーション
- ノンバーバル代替（絵文字/ジェスチャー画像）は OPEN_QUESTIONS #4 解消後
- **DONE**

### G009 ✅ — localStorage 永続化（GentleGalState）
- localStorage キー: `gentleGal.state.v1`
- ヘッダーリロードで復元、SmartDoll の `smartDoll.settings.v1` に影響なし
- ダブルタップでリセット（隠し配置）
- **DONE**

### G010 — ParticleLayer グローバル粒子レイヤー（保留）
- SmartDoll の ParticleLayer を src/effects/ にコピー済み（将来採用可能）
- 第1作では CSS finish-flash + vignette pulse で代替済み
- シリーズ統一フォーマットの軽量性志向と合致するため採用見送り

---

## 📦 ビルド・配布（Phase 3）

### G011 — Capacitor APK ビルド検証
- `npm run build && npx cap sync && npx cap open android` で Android Studio 起動
- 実機 or エミュで起動確認
- 検証: タップ・遷移・localStorage が動作

### G012 — Electron PC ビルド検証
- `npm run electron:build` で Windows .exe / macOS .app 出力
- 検証: 配布物を起動してフロー一周確認

### G013 — PWA manifest / Service Worker 設定
- `public/manifest.json` の id / name / theme_color を Gentle Gal 用に
- `public/sw.js` で `gentleGal-v${version}` キャッシュ名
- `npm run build && npm run preview` でホーム追加可能か確認
- 検証: モバイルブラウザで「ホーム画面に追加」が表示されること

### G014 — DLsite 申請準備
- 体験版ビルド（1メニューのみ解放）
- ストアフロント素材（サムネ・スクショ・説明文）
- 価格決定（OPEN_QUESTIONS）
- 別名義決定後に申請

---

## 🖼️ アセット制作（並行）

### G015 — キャラデザ確定
- ギャル像のビジュアル方針確定（OPEN_QUESTIONS）
- 髪型・髪色・スタイル・メイク

### G016 — 画像素材生成（8枚）
- WAIT-01/02 静止画
- ACT-01/02/03 ループアニメ
- FIN-01/02/03 フィニッシュ画
- easy 部門 ComfyUI I2V パイプライン経由

### G017 ✅ — irodori ボイス収録（フルボイス57件）
- フルボイス化（1ファイル1セリフ）+ コード改修一式
- VoiceDesign caption でギャル属性表現
- **DONE 2026-04-30**（DONE.md 参照）
