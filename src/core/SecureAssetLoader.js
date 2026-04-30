/**
 * SecureAssetLoader - 集約アセットローダー + メディア保護
 *
 * dev時: 暗号化なし、従来通り直接URLを返す
 * prod時: .enc ファイルをfetch → XOR復号 → Blob URL生成 → キャッシュ
 */

const ASSET_KEY = import.meta.env.VITE_ASSET_KEY || '';
const ENCRYPTED_EXTS = new Set(['webp', 'png', 'jpg', 'jpeg', 'mp3', 'wav']);
const blobCache = new Map();
const bufferCache = new Map();
const pendingLoads = new Map();

const MIME_MAP = {
  webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg',
  jpeg: 'image/jpeg', mp3: 'audio/mpeg', wav: 'audio/wav',
};

function getExt(path) {
  const clean = path.split('?')[0].split('#')[0];
  const dot = clean.lastIndexOf('.');
  return dot > 0 ? clean.slice(dot + 1).toLowerCase() : '';
}

function getMimeType(path) {
  return MIME_MAP[getExt(path)] || 'application/octet-stream';
}

function isEncryptable(path) {
  return ENCRYPTED_EXTS.has(getExt(path));
}

function xorDecrypt(data, key) {
  const keyBytes = new TextEncoder().encode(key);
  const keyLen = keyBytes.length;
  if (keyLen === 0) return data;
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ keyBytes[i % keyLen];
  }
  return result;
}

/** 暗号化対象URLをfetch→復号→Uint8Arrayで返す（共通コア） */
async function fetchAndDecrypt(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const encrypted = new Uint8Array(await res.arrayBuffer());
  return xorDecrypt(encrypted, ASSET_KEY);
}

/** dev時 or 非暗号化ファイルか判定 */
function isPlainUrl(url) {
  return import.meta.env.DEV || !ASSET_KEY || !url.endsWith('.enc');
}

// ─── Public API ──────────────────────────────────────────

/**
 * キャッシュ済みURLを同期的に返す
 * @param {string} resolvedUrl - resolveAssetUrl() の返り値
 * @returns {string|null}
 */
export function getCachedUrl(resolvedUrl) {
  if (!resolvedUrl || typeof resolvedUrl !== 'string') return null;
  if (resolvedUrl.startsWith('blob:') || resolvedUrl.startsWith('data:')) return resolvedUrl;
  if (isPlainUrl(resolvedUrl)) return resolvedUrl;
  return blobCache.get(resolvedUrl) ?? null;
}

/**
 * 相対パスからアセットURLを解決する（同期）
 *
 * dev時:  import.meta.url 相対でVite dev serverから取得
 * prod時: base相対パス（dist/ 内のコピー済みアセットを参照）
 *
 * @param {string} path - 'images/01/profile.webp' 等
 * @returns {string}
 */
export function resolveAssetUrl(path) {
  if (!path || typeof path !== 'string') return '';
  if (/^(?:https?:|data:|blob:|\/\/)/.test(path)) return path;
  const clean = path.replace(/^\/+/, '');

  if (import.meta.env.DEV) {
    // dev時: Vite dev server が assets/ をルートから配信
    try {
      return new URL(`../../assets/${clean}`, import.meta.url).href;
    } catch {
      return '';
    }
  }

  // prod時: dist/ にコピー済みのアセットをbase相対パスで参照
  const base = `./${clean}`;
  if (ASSET_KEY && isEncryptable(clean)) return base + '.enc';
  return base;
}

/**
 * 解決済みURLからBlob URLをロード
 * @param {string} resolvedUrl
 * @returns {Promise<string>}
 */
export async function loadResolvedAsset(resolvedUrl) {
  if (!resolvedUrl || typeof resolvedUrl !== 'string') return '';
  if (resolvedUrl.startsWith('blob:') || resolvedUrl.startsWith('data:')) return resolvedUrl;
  if (isPlainUrl(resolvedUrl)) return resolvedUrl;

  if (blobCache.has(resolvedUrl)) return blobCache.get(resolvedUrl);
  if (pendingLoads.has(resolvedUrl)) return pendingLoads.get(resolvedUrl);

  const promise = (async () => {
    try {
      const decrypted = await fetchAndDecrypt(resolvedUrl);
      const originalPath = resolvedUrl.replace(/\.enc$/, '');
      const blob = new Blob([decrypted], { type: getMimeType(originalPath) });
      const blobUrl = URL.createObjectURL(blob);
      blobCache.set(resolvedUrl, blobUrl);
      return blobUrl;
    } catch (err) {
      console.error('[SecureAssetLoader] Failed:', resolvedUrl, err);
      return resolvedUrl.replace(/\.enc$/, '');
    } finally {
      pendingLoads.delete(resolvedUrl);
    }
  })();

  pendingLoads.set(resolvedUrl, promise);
  return promise;
}

/**
 * 解決済みURLからArrayBufferをロード（音声用）
 * @param {string} resolvedUrl
 * @returns {Promise<ArrayBuffer|null>}
 */
export async function loadResolvedAsArrayBuffer(resolvedUrl) {
  if (!resolvedUrl || typeof resolvedUrl !== 'string') return null;

  const cacheKey = `buf:${resolvedUrl}`;
  if (bufferCache.has(cacheKey)) return bufferCache.get(cacheKey);

  try {
    if (isPlainUrl(resolvedUrl)) {
      const res = await fetch(resolvedUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ab = await res.arrayBuffer();
      bufferCache.set(cacheKey, ab);
      return ab;
    }
    const decrypted = await fetchAndDecrypt(resolvedUrl);
    const ab = decrypted.buffer;
    bufferCache.set(cacheKey, ab);
    return ab;
  } catch {
    return null;
  }
}
