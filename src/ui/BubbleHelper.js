/**
 * BubbleHelper - DOM吹き出し作成の共通ロジック
 *
 * NPCSprite / BotSprite の _createBubble / _setBubbleImage を統一。
 */
import { resolveAssetUrl, loadResolvedAsset } from '../core/SecureAssetLoader.js';

/**
 * bot-bubble-layer に吹き出しDOM要素を作成
 * @param {string} debugLabel - エラーログ用ラベル
 * @returns {{ bubble: HTMLElement, img: HTMLElement }}
 */
export function createBubble(debugLabel = 'Sprite') {
  const bubble = document.createElement('div');
  bubble.className = 'bot-bubble';
  bubble.hidden = true;

  const img = document.createElement('img');
  img.className = 'bot-bubble__img';
  img.alt = '';
  img.onerror = () => console.warn(`[${debugLabel}] img load failed: ${img.src}`);
  bubble.appendChild(img);

  const tail = document.createElement('div');
  tail.className = 'bot-bubble__tail';
  bubble.appendChild(tail);

  const overlay = document.getElementById('bot-bubble-layer');
  if (overlay) overlay.appendChild(bubble);

  return { bubble, img };
}

/**
 * アセットパスを解決して img.src にセット（暗号化対応）
 * @param {HTMLImageElement} imgEl
 * @param {string} assetPath - e.g. 'images/01/profile.webp'
 */
export async function setBubbleImage(imgEl, assetPath) {
  const resolved = resolveAssetUrl(assetPath);
  try {
    const url = await loadResolvedAsset(resolved);
    imgEl.src = url;
  } catch {
    imgEl.src = resolved;
  }
}
