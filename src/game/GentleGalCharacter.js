/**
 * GentleGalCharacter — 単体キャラ「やさしいギャル」のアセット定義
 *
 * Gentleシリーズ #1。SmartDoll の CharacterData.js を単体キャラ用に大幅簡略化。
 *   - 30体マップ廃止 → 単一キャラのみ
 *   - outfit (casual/cosplay) 切替廃止
 *   - profile/foreplay/play/cumshot 4ポーズ → wait/act/finish 3カテゴリへ再構成
 *
 * アセット構造:
 *   assets/images/wait/wait-stage{1|2}.webp    (Stage 1/2 待機画)
 *   assets/images/act/act-{01..03}.webp        (行為①〜③ループアニメ)
 *   assets/images/finish/fin-{01..03}.webp     (行為①〜③フィニッシュ)
 *
 * VOICE_POOLS は irodori VoiceDesign で生成したフルボイス（57件）を
 * テキストプールと 1:1 で対応させる構造。シーン側はテキスト pick で得た idx を
 * 同じ pool に当ててボイスを再生する。
 */

const VOICE_DIR = 'voice'; // assets/audio/voice/ 配下

export const GENTLE_GAL = {
  id: 'GG-001',
  codeName: 'GAL',
  commonName: 'やさしいギャル',
  archetype: 'gyaru-gentle',
  themeColor: '#ffb74c',
  voiceDir: VOICE_DIR,
};

/** 待機画像 (好意度 stage に応じて切替) */
export function getWaitImage(stage = 1) {
  const n = stage === 2 ? 2 : 1;
  return `assets/images/wait/wait-stage${n}.webp`;
}

/** 行為ループ画像 (menuIndex: 0|1|2) */
export function getActImage(menuIndex = 0) {
  const n = String(Math.max(0, Math.min(2, menuIndex)) + 1).padStart(2, '0');
  return `assets/images/act/act-${n}.webp`;
}

/** フィニッシュ画像 (menuIndex: 0|1|2) */
export function getFinishImage(menuIndex = 0) {
  const n = String(Math.max(0, Math.min(2, menuIndex)) + 1).padStart(2, '0');
  return `assets/images/finish/fin-${n}.webp`;
}

/** ボイスパス取得ヘルパ。SecureAssetLoader.resolveAssetUrl が `assets/` を補うので
 * ここでは `assets/` プレフィックスを付けない（Vite glob lookup key と一致させる） */
export function getVoicePath(filename) {
  return `audio/voice/${filename}`;
}

/** BGM/SE パス取得ヘルパ（`assets/` プレフィックスなし） */
export function getBgmPath(filename) {
  return `audio/bgm/${filename}`;
}
export function getSePath(filename) {
  return `audio/se/${filename}`;
}

/**
 * フルボイス（irodori voice cloning）。47 ファイル。
 * 1文目はランダムプール、2文目は固定 1 文（テキストもボイスも固定）。
 *
 * 構造:
 *   GREET1: { 1: [stage1 発話プール], 2: [stage2 発話プール] }    ←ランダム
 *   GREET2: { 1: 'fixed.wav', 2: 'fixed.wav' }                    ←固定
 *   ACCEPT/START1/AFTERGLOW1: [menuIndex0, menuIndex1, menuIndex2] ←ランダムプール
 *   START2/PROMISE/AFTER_FINISH_2: 固定 1 ファイル
 *   KEEP: [[1文目, 2文目], ...] メニュー別 2 ファイル
 */
export const VOICE_POOLS = {
  // === WaitingScene ===
  GREET1: {
    1: ['greet1/s1-01.wav', 'greet1/s1-02.wav'],
    2: ['greet1/s2-01.wav', 'greet1/s2-02.wav'],
  },
  GREET2: {
    1: 'greet2/s1.wav',
    2: 'greet2/s2.wav',
  },
  AFTER_FINISH_1: ['after1/01.wav', 'after1/02.wav', 'after1/03.wav'],
  AFTER_FINISH_2: 'after2.wav',
  ACCEPT: [
    ['accept/m0-01.wav', 'accept/m0-02.wav'],
    ['accept/m1-01.wav', 'accept/m1-02.wav'],
    ['accept/m2-01.wav', 'accept/m2-02.wav'],
  ],
  REJECT: ['reject/01.wav', 'reject/02.wav'],

  // === ActionScene ===
  START1: [
    ['start1/m0-01.wav', 'start1/m0-02.wav', 'start1/m0-03.wav'],
    ['start1/m1-01.wav', 'start1/m1-02.wav', 'start1/m1-03.wav'],
    ['start1/m2-01.wav'],
  ],
  // START2: 固定 1 文 / メニュー
  START2: [
    'start2/m0.wav',
    'start2/m1.wav',
    'start2/m2.wav',
  ],
  // KEEP: メニュー別 [1文目, 2文目]、両方 voice
  KEEP: [
    ['keep/m0-01.wav', 'keep/m0-02.wav'],
    ['keep/m1-01.wav', 'keep/m1-02.wav'],
    ['keep/m2-01.wav', 'keep/m2-02.wav'],
  ],
  // プレイ中の ambient ループ（メニュー別の喘ぎ声）
  ACT_LOOP: [
    'act-loop/m0.wav',
    'act-loop/m1.wav',
    'act-loop/m2.wav',
  ],

  // === FinishScene ===
  AFTERGLOW1: [
    ['afterglow1/m0-01.wav', 'afterglow1/m0-02.wav'],
    ['afterglow1/m1-01.wav', 'afterglow1/m1-02.wav'],
    ['afterglow1/m2-01.wav'],
  ],
  RUSHED: ['rushed/01.wav', 'rushed/02.wav'],
  PATIENT: ['patient/01.wav', 'patient/02.wav'],
  PROMISE: 'promise.wav',
};

export const BGM_FILES = {
  // BGM 未配置（OPEN_QUESTIONS で曲決定後に追加）。GentleAudio が黙殺する。
  WAIT: null,
  ACT:  null,
};

export const SE_FILES = {
  // 選択肢タップSE / Fire prompt 出現SE は廃止（Izumi 2026-04-30）
  // Fire 確定時のみ splash.mp3（se-fire-appear.mp3 のコピー）を再生
  SPLASH: 'splash.mp3',
};
