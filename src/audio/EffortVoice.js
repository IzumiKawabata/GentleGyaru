/**
 * EffortVoice - 汎用エフォートボイスパターンシステム（Q-H008 / D-006 由来）
 *
 * 目的:
 *   セリフ紐付けの「1cue=1ボイスファイル」指定から離脱し、
 *   「状況 × キャラ × 強度」でエフォートボイスをパターン抽選する設計に再編。
 *
 * 108ファイル（3キャラ × 36パターン）を効率よく使い回す。
 * Irodori-TTS-500M-v2-VoiceDesign 由来（BREATH.md D-006）。
 *
 * ── パターン一覧 ─────────────────────────────
 *  INTRO_GREETING  挨拶時の柔らかい吐息      sigh / laugh / gasp
 *  INTRO_REACT     開始直後の反応            gasp / moan
 *  LOOP_CUE        ループcue連動             moan / gasp
 *  LOOP_AMBIENT    ループ中の差し込み        moan / gasp
 *  LOOP_PEAK       終盤の高まり              moan / gasp
 *  FIRE_CLIMAX     FIRE時のクライマックス    climax（固定）
 *  OUTRO_AFTER     余韻                      sigh / laugh
 *  NPC_REACT_COIN  NPC話しかけ時のフィードバック  gasp / laugh / sigh
 *
 * ── 使い方 ───────────────────────────────────
 *   audioManager.playEffort('LOOP_CUE', 'c01');
 *   audioManager.playEffort('FIRE_CLIMAX', 'c02');
 *   audioManager.playEffort('INTRO_GREETING', 'c03', { volume: 0.5 });
 */

// キャラ別のトーン寄せ（何もなければ BASE_PATTERNS を使う）
// weights は category → 相対重み
const BASE_PATTERNS = {
  INTRO_GREETING: { sigh: 2, laugh: 1, gasp: 1 },
  INTRO_REACT:    { gasp: 2, moan: 1 },
  LOOP_CUE:       { moan: 4, gasp: 2 },
  LOOP_AMBIENT:   { moan: 3, gasp: 2 },
  LOOP_PEAK:      { moan: 3, gasp: 3 },
  FIRE_CLIMAX:    { climax: 1 },
  OUTRO_AFTER:    { sigh: 3, laugh: 1 },
  NPC_REACT_COIN: { gasp: 1, laugh: 1, sigh: 1 },
};

// キャラ別トーン：みく(c01)は柔らか寄り / りな(c02)は明るく高揚 / あかね(c03)は強め
const CHAR_TUNING = {
  c01: {
    INTRO_GREETING: { sigh: 3, laugh: 1, gasp: 1 },  // みくは吐息多め
    LOOP_CUE:       { moan: 5, gasp: 1 },             // 息遣い寄り
    OUTRO_AFTER:    { sigh: 4 },                      // 吐息のみ
  },
  c02: {
    INTRO_GREETING: { sigh: 1, laugh: 2, gasp: 2 },  // りなは明るく
    LOOP_PEAK:      { moan: 3, gasp: 4 },             // 高まり強め
    OUTRO_AFTER:    { sigh: 2, laugh: 2 },            // 笑い混じり
  },
  c03: {
    INTRO_GREETING: { sigh: 2, laugh: 1, gasp: 2 },
    LOOP_CUE:       { moan: 4, gasp: 2 },             // moan重視
    LOOP_PEAK:      { moan: 3, gasp: 3 },             // 均等
  },
  c04: {
    INTRO_GREETING: { sigh: 4, laugh: 0, gasp: 1 },   // ゆいは静か・吐息ベース
    LOOP_CUE:       { moan: 3, gasp: 2 },
    OUTRO_AFTER:    { sigh: 5 },
  },
  c05: {
    INTRO_GREETING: { sigh: 4, laugh: 1, gasp: 1 },   // さきは癒し・とろみ寄り
    LOOP_CUE:       { moan: 5, gasp: 1 },
    OUTRO_AFTER:    { sigh: 4, laugh: 1 },
  },
  c06: {
    INTRO_GREETING: { sigh: 1, laugh: 3, gasp: 2 },   // まやは関西ノリ・笑い多め
    LOOP_PEAK:      { moan: 2, gasp: 5 },
    OUTRO_AFTER:    { sigh: 2, laugh: 3 },
  },
  c07: {
    INTRO_GREETING: { sigh: 1, laugh: 2, gasp: 3 },   // のあはハスキー・gasp強め
    LOOP_CUE:       { moan: 3, gasp: 3 },
    LOOP_PEAK:      { moan: 4, gasp: 3 },
  },
  c08: {
    INTRO_GREETING: { sigh: 3, laugh: 0, gasp: 2 },   // ふみは静かに厳しい
    LOOP_CUE:       { moan: 4, gasp: 2 },
    OUTRO_AFTER:    { sigh: 3 },
  },
  c09: {
    INTRO_GREETING: { sigh: 2, laugh: 1, gasp: 2 },   // すみはダウントーン
    LOOP_CUE:       { moan: 3, gasp: 2 },
    LOOP_PEAK:      { moan: 4, gasp: 2 },
  },
  c10: {
    INTRO_GREETING: { sigh: 1, laugh: 3, gasp: 2 },   // ひなは高めしゃれぴょん
    LOOP_PEAK:      { moan: 3, gasp: 4 },
    OUTRO_AFTER:    { sigh: 2, laugh: 3 },
  },
};

/**
 * パターンIDとcharIdから category を抽選する
 * @param {string} patternId
 * @param {string} charId
 * @returns {string|null} category name
 */
export function pickCategory(patternId, charId) {
  const base = BASE_PATTERNS[patternId];
  if (!base) return null;
  const override = CHAR_TUNING[charId]?.[patternId];
  const weights = override || base;

  // 重み付き抽選
  let total = 0;
  for (const w of Object.values(weights)) total += w;
  if (total <= 0) return null;

  let r = Math.random() * total;
  for (const [cat, w] of Object.entries(weights)) {
    r -= w;
    if (r <= 0) return cat;
  }
  // fallback（浮動小数誤差）
  const keys = Object.keys(weights);
  return keys[keys.length - 1];
}

/**
 * パターン存在チェック
 */
export function hasPattern(patternId) {
  return Object.prototype.hasOwnProperty.call(BASE_PATTERNS, patternId);
}

/**
 * 全パターン名を返す（テスト用・デバッグ用）
 */
export function listPatterns() {
  return Object.keys(BASE_PATTERNS);
}

/**
 * Anti-repeat メモリ（直近 N 件の同パターン連打抑制）
 * AudioManager が保持する想定で、ここでは純粋関数のみ提供。
 */
export class EffortRepeatGuard {
  constructor(windowSize = 3) {
    this._window = windowSize;
    this._history = [];
  }

  /** 同じ category が連続したかチェック */
  shouldRepick(category) {
    if (this._history.length === 0) return false;
    const last = this._history[this._history.length - 1];
    return last === category;
  }

  push(category) {
    this._history.push(category);
    if (this._history.length > this._window) this._history.shift();
  }

  clear() {
    this._history = [];
  }
}
