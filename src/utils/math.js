/**
 * math.js - 数学ユーティリティ
 */

/**
 * 2点間の距離を計算する
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number}
 */
export function distance(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 矩形の中心点を返す
 * @param {{ x: number, y: number, w: number, h: number }} rect
 * @returns {{ x: number, y: number }}
 */
export function rectCenter(rect) {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}
