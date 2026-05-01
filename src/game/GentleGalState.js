/**
 * GentleGalState — gameState の localStorage 永続化
 *
 * SmartDollState を単体キャラ・好意度2段階用に大幅簡略化。
 *   - ガチャ機構（gachaTokens / GACHA_POOL）削除
 *   - 日替わり無料枠削除
 *   - 衣装解放（casual/cosplay）削除
 *   - Patreon 連携削除
 *   - 30体管理削除（lastCharId / playHistory[charId] / unlockedChars）
 *
 * スキーマ:
 *   {
 *     affectionStage: 1 | 2,
 *     menuUnlocked:   [bool, bool, bool],
 *     completedActs:  [bool, bool, bool],
 *     currentScene:   "waiting" | "action" | "finish",
 *     // 設定
 *     voiceVolume:    0..1,
 *     seVolume:       0..1,
 *     bgmVolume:      0..1,
 *     muted:          bool,
 *     hapticsOn:      bool,
 *   }
 *
 * Storage Key: 'gentleGal.state.v1'
 *   - SmartDoll の 'smartDoll.settings.v1' と完全分離
 */

const STORAGE_KEY = 'gentleGal.state.v1';

export const MENU_COUNT = 3;

// 愛情ゲージ: ACT-01/02 を fire するたびに +1。MAX で本番(ACT-03)が解放される
export const LOVE_MAX = 3;

// ACT-01/02 は最初から押せる。ACT-03（本番）は条件付き = 押せるが loveGauge < MAX で reject。
const DEFAULTS = {
  // 進行
  affectionStage: 1,
  loveGauge:     1,                      // 0..LOVE_MAX（初期 1 = 最初から少し受容感あり、Izumi 2026-05-01）
  menuUnlocked:  [true, true, true],     // 全部押せる（lock UI 廃止）。ACT-03 は loveGauge で condition
  completedActs: [false, false, false],
  currentScene:  'waiting',
  // 設定
  voiceVolume: 0.85,
  seVolume:    0.8,
  bgmVolume:   0.6,
  muted:       false,
  hapticsOn:   true,
};

function clamp01(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function sanitizeBoolArray(raw, len) {
  const out = new Array(len).fill(false);
  if (!Array.isArray(raw)) return out;
  for (let i = 0; i < len; i++) {
    if (raw[i] === true) out[i] = true;
  }
  return out;
}

function sanitize(raw) {
  const out = { ...DEFAULTS };
  if (!raw || typeof raw !== 'object') return out;

  if (raw.affectionStage === 2) out.affectionStage = 2;

  // loveGauge は 0..LOVE_MAX
  if (Number.isFinite(raw.loveGauge) && raw.loveGauge >= 0) {
    out.loveGauge = Math.min(LOVE_MAX, Math.floor(raw.loveGauge));
  }

  out.completedActs = sanitizeBoolArray(raw.completedActs, MENU_COUNT);
  // 全メニュー押下可能（lock UI 廃止）。conditional は loveGauge で別判定
  out.menuUnlocked = [true, true, true];

  if (raw.currentScene === 'action' || raw.currentScene === 'finish' || raw.currentScene === 'waiting') {
    out.currentScene = raw.currentScene;
  }

  const v = clamp01(raw.voiceVolume); if (v !== null) out.voiceVolume = v;
  const s = clamp01(raw.seVolume);    if (s !== null) out.seVolume    = s;
  const b = clamp01(raw.bgmVolume);   if (b !== null) out.bgmVolume   = b;
  if (typeof raw.muted    === 'boolean') out.muted    = raw.muted;
  if (typeof raw.hapticsOn === 'boolean') out.hapticsOn = raw.hapticsOn;

  return out;
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return sanitize(JSON.parse(raw));
  } catch (_) {
    return { ...DEFAULTS };
  }
}

export function saveState(state) {
  try {
    const data = sanitize(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (_) { /* no-op (Safari private mode 等) */ }
}

export function resetState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
  return { ...DEFAULTS };
}

/**
 * 愛情ゲージの増減ルール（Izumi 2026-04-30 確定）:
 *   - 内容: ACT-03 (本番) は加点なし（既に MAX 必須なので）
 *   - タイミング: Keep を多く挟んでから Fire するほど加点（焦らせない＝受容と優しさ哲学）
 *
 * @returns 加減量（負も理論上ありえるが現状は 0..2）
 */
export function calcLoveGain(menuIndex, keepCount = 0) {
  if (menuIndex === 2) return 0;     // 本番（ACT-03）: MAX で達成、加点なし
  if (keepCount <= 0) return 0;      // 早 Fire（焦らさず即発射）: 加点なし
  if (keepCount >= 3) return 2;      // 焦らしボーナス: +2
  return 1;                           // 標準: +1
}

/**
 * フィニッシュ完了時に呼ぶ。
 *   - state.completedActs[menuIndex] = true
 *   - state.affectionStage = 2（Stage 1→2 昇格、Stage 2 は永続）
 *   - state.loveGauge += calcLoveGain(menuIndex, keepCount)（MAX 頭打ち、最低0）
 *
 * @param {{ keepCount?: number }} opts - ActionScene で Keep が選ばれた回数
 * @returns { affectionStage, completedActs, loveGauge, gain }
 */
export function recordFinish(state, menuIndex, opts = {}) {
  if (!state) return null;
  if (typeof menuIndex !== 'number' || menuIndex < 0 || menuIndex >= MENU_COUNT) return null;

  state.completedActs[menuIndex] = true;
  state.affectionStage = 2;

  const keepCount = Number.isFinite(opts.keepCount) ? opts.keepCount : 0;
  const gain = calcLoveGain(menuIndex, keepCount);
  if (!Number.isFinite(state.loveGauge)) state.loveGauge = 0;
  state.loveGauge = Math.max(0, Math.min(LOVE_MAX, state.loveGauge + gain));

  saveState(state);

  return {
    affectionStage: state.affectionStage,
    completedActs: [...state.completedActs],
    loveGauge:     state.loveGauge,
    gain,
  };
}

/** メニューが押下可能か（全部 true。historicalな互換用） */
export function isMenuUnlocked(state, menuIndex) {
  return !!(state?.menuUnlocked?.[menuIndex]);
}

/** 本番（ACT-03）が条件OKか */
export function canDoMain(state) {
  return (state?.loveGauge ?? 0) >= LOVE_MAX;
}

/** 本番を未MAXで強要した時に呼ぶ。ゲージを1下げる（最低0）。Izumi 2026-04-30 哲学:
 *  「受容と優しさ」が芯のキャラ。無理に強要されると寂しくなる → ゲージ低下で表現。 */
export function recordMainReject(state) {
  if (!state) return 0;
  state.loveGauge = Math.max(0, (state.loveGauge || 0) - 1);
  saveState(state);
  return state.loveGauge;
}

/** ハート絵文字で愛情ゲージ表示（"💗💗・"形式） */
export function loveGaugeEmoji(state) {
  const v = Math.max(0, Math.min(LOVE_MAX, state?.loveGauge ?? 0));
  return '💗'.repeat(v) + '・'.repeat(LOVE_MAX - v);
}

export const STATE_DEFAULTS = DEFAULTS;
