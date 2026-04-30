import { App } from './app/App.js';

console.log('[GentleGal] boot — v0.1');

window.addEventListener('load', async () => {
  const loading = document.getElementById('loading-screen');
  if (loading) {
    loading.style.opacity = '0';
    setTimeout(() => loading.remove(), 400);
  }
  const app = new App();
  app.start();
  window.__gentleGalApp = app;
});
