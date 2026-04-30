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

/** ボイスパス取得ヘルパ。OPEN_QUESTIONS でファイル名確定後に整える */
export function getVoicePath(filename) {
  return `assets/audio/voice/${filename}`;
}

/** BGM/SE パス取得ヘルパ */
export function getBgmPath(filename) {
  return `assets/audio/bgm/${filename}`;
}
export function getSePath(filename) {
  return `assets/audio/se/${filename}`;
}

/**
 * Voice ファイル名予約。
 * 暫定: SmartDoll の rina (cheerful) 非言語ボイスを wav 拡張子のまま流用。
 * irodori 収録済みファイル（OPEN_QUESTIONS #5 解消後）に差し替え時、
 * 拡張子を ogg に戻す予定。
 */
export const VOICE_FILES = {
  WAIT_STAGE_1: 'wait-stage1.wav',
  WAIT_STAGE_2: 'wait-stage2.wav',
  ACT_01: 'act-01-loop.wav',
  ACT_02: 'act-02-loop.wav',
  ACT_03: 'act-03-loop.wav',
  FINISH:  'finish.wav',
  REJECT_LOCKED: 'reject-locked.wav',
  // play中タップ用の短い反応ボイス（ランダム選択）
  PLAY_TAP_01: 'play-tap-01.wav',
  PLAY_TAP_02: 'play-tap-02.wav',
  PLAY_TAP_03: 'play-tap-03.wav',
};

export const PLAY_TAP_VOICES = [
  VOICE_FILES.PLAY_TAP_01,
  VOICE_FILES.PLAY_TAP_02,
  VOICE_FILES.PLAY_TAP_03,
];

export const BGM_FILES = {
  // BGM 未配置（OPEN_QUESTIONS で曲決定後に追加）。GentleAudio が黙殺する。
  WAIT: null,
  ACT:  null,
};

export const SE_FILES = {
  TAP:         'se-tap.mp3',
  FIRE_APPEAR: 'se-fire-appear.mp3',
};
