/**
 * hapticsBridge — `navigator.vibrate` の薄いラッパー (S008)
 *
 * - feature detect: Android Chrome / 一部 Desktop で動作。iOS Safari は未対応 → no-op
 * - プリセット名指定 ('tap'/'pulse'/'hit'/'fire'/'double') または raw pattern (number / number[])
 * - グローバル enable/disable トグル (S010 で SettingsScene に接続予定)
 * - 例外時は静かに false を返す (UI 動線を絶対に止めない)
 */

const PRESETS = {
  tap:    [12],
  pulse:  [30],
  hit:    [40],
  double: [10, 50, 10],
  fire:   [60, 40, 80, 40, 120],
};

let _enabled = true;
let _supportedCache = null;

function detect() {
  if (_supportedCache !== null) return _supportedCache;
  _supportedCache = (
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function'
  );
  return _supportedCache;
}

export const hapticsBridge = {
  isSupported() { return detect(); },
  isEnabled() { return _enabled; },
  setEnabled(on) { _enabled = !!on; },

  /**
   * @param {string|number|number[]} pattern  プリセット名 / ms / [on,off,on,...]
   * @returns {boolean} 実行できたかどうか
   */
  vibrate(pattern) {
    if (!_enabled) return false;
    if (!detect()) return false;
    const p = typeof pattern === 'string' ? PRESETS[pattern] : pattern;
    if (!p) return false;
    try {
      return navigator.vibrate(p) === true;
    } catch (_) {
      return false;
    }
  },

  cancel() {
    if (!detect()) return;
    try { navigator.vibrate(0); } catch (_) { /* no-op */ }
  },
};
