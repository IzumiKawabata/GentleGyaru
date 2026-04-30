import { App } from './app/App.js';

console.log('[GentleGal] boot — v0.1');

// 起動時にプリロードする画像（全シーンで使用）
const PRELOAD_IMAGES = [
  'assets/images/wait/wait-stage1.webp',
  'assets/images/wait/wait-stage2.webp',
  'assets/images/act/act-01.webp',
  'assets/images/act/act-02.webp',
  'assets/images/act/act-03.webp',
  'assets/images/finish/fin-01.webp',
  'assets/images/finish/fin-02.webp',
  'assets/images/finish/fin-03.webp',
];

// 最低表示時間（splash がパッと消えると速すぎて雰囲気が損なわれる）
const SPLASH_MIN_MS = 1800;

function setBarFill(pct) {
  const fill = document.getElementById('splash-bar-fill');
  if (fill) fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
}

function preloadOne(url, onProgress) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { onProgress?.(); resolve(url); };
    img.onerror = () => { onProgress?.(); resolve(url); }; // エラーでも進む
    img.src = url;
  });
}

async function preloadAll(urls) {
  let done = 0;
  const total = urls.length;
  setBarFill(0);
  await Promise.all(urls.map((u) => preloadOne(u, () => {
    done += 1;
    setBarFill((done / total) * 100);
  })));
  setBarFill(100);
}

window.addEventListener('load', async () => {
  const startedAt = performance.now();

  // 並行: 画像プリロード + 最低表示時間
  await Promise.all([
    preloadAll(PRELOAD_IMAGES),
    new Promise((r) => setTimeout(r, SPLASH_MIN_MS)),
  ]);

  // ふわっとフェードアウト
  const splash = document.getElementById('splash');
  if (splash) {
    splash.dataset.fade = 'out';
    setTimeout(() => splash.remove(), 1000);
  }

  const loading = document.getElementById('loading-screen');
  if (loading) {
    loading.style.opacity = '0';
    setTimeout(() => loading.remove(), 400);
  }

  const app = new App();
  app.start();
  window.__gentleGalApp = app;

  console.log(`[GentleGal] ready in ${Math.round(performance.now() - startedAt)}ms`);
});
