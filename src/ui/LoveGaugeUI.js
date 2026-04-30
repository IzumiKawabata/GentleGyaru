/**
 * LoveGaugeUI — 左上の愛情ゲージ表示（3個ハート）
 *
 * state.loveGauge (0..LOVE_MAX) に応じて、ハートの filled 属性を切り替える。
 * finish シーン中は CSS で opacity:0 になる（_app[data-route="finish"]）。
 */

import { LOVE_MAX } from '../game/GentleGalState.js';

export function renderLoveGauge(state) {
  const root = document.getElementById('love-gauge');
  if (!root) return;
  const v = Math.max(0, Math.min(LOVE_MAX, state?.loveGauge || 0));
  const hearts = root.querySelectorAll('.love-gauge__heart');
  hearts.forEach((h, i) => {
    h.dataset.filled = i < v ? 'true' : 'false';
  });
}
