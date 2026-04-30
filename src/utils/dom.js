/**
 * DOM ユーティリティ - 共通のDOM操作ヘルパー
 */

/** querySelector ショートカット */
export const $ = (sel) => document.querySelector(sel);

/** モーダルを閉じる */
export function closeModal(id) {
  const el = $(`#${id}`);
  if (el) el.hidden = true;
}

/** トースト通知を表示（2秒後に自動非表示） */
export function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}
