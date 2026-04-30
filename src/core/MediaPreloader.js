/**
 * MediaPreloader - 画像・動画プリロード
 * SecureAssetLoader経由でアセットを復号・Blob化してからプリロードする
 */
import { loadResolvedAsset } from './SecureAssetLoader.js';

const imageCache = new Map();

const VIDEO_EXT = new Set(['mp4', 'webm', 'ogv']);

function getExt(url) {
  const path = url.split('?')[0].split('#')[0];
  const dot = path.lastIndexOf('.');
  return dot > 0 ? path.slice(dot + 1).toLowerCase() : '';
}

function isVideo(url) {
  return typeof url === 'string' && VIDEO_EXT.has(getExt(url));
}

function preloadImage(url, priority = 'auto') {
  if (!url || typeof url !== 'string') return Promise.resolve();
  if (isVideo(url)) return Promise.resolve();

  const cached = imageCache.get(url);
  if (cached) return cached;

  let resolve;
  const promise = new Promise((r) => { resolve = r; });

  // 暗号化アセットの場合はまず復号してBlobURLを得る
  loadResolvedAsset(url).then((blobUrl) => {
    const img = new Image();
    if (priority === 'high' && 'fetchPriority' in img) img.fetchPriority = 'high';
    if ('decoding' in img) img.decoding = 'async';
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve(blobUrl);
    };
    img.addEventListener('load', () => {
      img.decode?.().catch(() => {}).finally(done);
    }, { once: true });
    img.addEventListener('error', done, { once: true });
    img.src = blobUrl;
    if (img.complete) img.decode?.().catch(() => {}).finally(done);
  }).catch(() => resolve(url));

  imageCache.set(url, promise);
  return promise;
}

export function preloadImages(urls, priority = 'auto') {
  const tasks = [...new Set(urls.filter(Boolean))].map((url) =>
    preloadImage(url, priority).catch(() => {})
  );
  return Promise.allSettled(tasks);
}

