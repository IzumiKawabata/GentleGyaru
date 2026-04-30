/**
 * G004 プレースホルダー素材生成スクリプト
 *
 * 実画像/アイコンが揃うまでの開発用スタブを sharp で生成する。
 *   - assets/images/wait/wait-stage{1,2}.webp   (1080×1920)
 *   - assets/images/act/act-{01..03}.webp        (1080×1920)
 *   - assets/images/finish/fin-{01..03}.webp     (1080×1920)
 *   - public/icons/icon-192.png
 *   - public/icons/icon-512.png
 *   - public/icons/icon-maskable-512.png
 *
 * 実行: node scripts/generate-placeholders.mjs
 *
 * 実画像・アイコンが揃ったら本スクリプトの出力は手動で上書きされる。
 */

import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const W = 1080;
const H = 1920;

// 各画像の色味とラベル（Stage/Action/Finish の差別化用）
const IMAGE_PRESETS = [
  { path: 'assets/images/wait/wait-stage1.webp', bg: '#3a3548', label: 'WAIT-01\n(Stage 1)', tone: 'cool',  emoji: '👋' },
  { path: 'assets/images/wait/wait-stage2.webp', bg: '#5a3848', label: 'WAIT-02\n(Stage 2)', tone: 'warm',  emoji: '🤗' },
  { path: 'assets/images/act/act-01.webp',       bg: '#a04860', label: 'ACT-01',             tone: 'soft',  emoji: '①' },
  { path: 'assets/images/act/act-02.webp',       bg: '#b04068', label: 'ACT-02',             tone: 'mid',   emoji: '②' },
  { path: 'assets/images/act/act-03.webp',       bg: '#c03870', label: 'ACT-03',             tone: 'hot',   emoji: '③' },
  { path: 'assets/images/finish/fin-01.webp',    bg: '#a02050', label: 'FIN-01',             tone: 'climax', emoji: '✦' },
  { path: 'assets/images/finish/fin-02.webp',    bg: '#b02058', label: 'FIN-02',             tone: 'climax', emoji: '✦' },
  { path: 'assets/images/finish/fin-03.webp',    bg: '#c02060', label: 'FIN-03',             tone: 'climax', emoji: '✦' },
];

const ICON_PRESETS = [
  { path: 'public/icons/icon-192.png', size: 192, label: 'GG' },
  { path: 'public/icons/icon-512.png', size: 512, label: 'GG' },
  { path: 'public/icons/icon-maskable-512.png', size: 512, label: 'GG', maskable: true },
];

function buildSvg({ w, h, bg, label, emoji }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <radialGradient id="grad" cx="50%" cy="40%" r="80%">
      <stop offset="0%" stop-color="${bg}" stop-opacity="1"/>
      <stop offset="100%" stop-color="#1a1a1a" stop-opacity="1"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#grad)"/>
  <g font-family="Arial, sans-serif" fill="#fff" text-anchor="middle" opacity="0.85">
    <text x="${w / 2}" y="${h * 0.42}" font-size="${Math.round(w * 0.32)}" font-weight="200">${emoji}</text>
    <text x="${w / 2}" y="${h * 0.58}" font-size="${Math.round(w * 0.075)}" font-weight="500" letter-spacing="6">
      ${label.split('\n').map((line, i) => `<tspan x="${w / 2}" dy="${i === 0 ? 0 : Math.round(w * 0.09)}">${line}</tspan>`).join('')}
    </text>
    <text x="${w / 2}" y="${h * 0.92}" font-size="${Math.round(w * 0.025)}" opacity="0.45">PLACEHOLDER</text>
  </g>
</svg>`;
}

function buildIconSvg({ size, label, maskable }) {
  // maskable は周囲 ~10% を safe area として中央に寄せる
  const safe = maskable ? 0.7 : 0.86;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="#3a2e3a"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${(size / 2) * safe}" fill="#a04060"/>
  <text x="${size / 2}" y="${size * 0.6}" font-family="Arial, sans-serif" font-size="${Math.round(size * 0.42)}"
        font-weight="700" fill="#fff" text-anchor="middle">${label}</text>
</svg>`;
}

async function main() {
  let count = 0;
  for (const p of IMAGE_PRESETS) {
    const svg = buildSvg({ w: W, h: H, bg: p.bg, label: p.label, emoji: p.emoji });
    const out = join(root, p.path);
    mkdirSync(dirname(out), { recursive: true });
    await sharp(Buffer.from(svg))
      .webp({ quality: 80 })
      .toFile(out);
    console.log(`[image] ${p.path}`);
    count++;
  }

  for (const p of ICON_PRESETS) {
    const svg = buildIconSvg(p);
    const out = join(root, p.path);
    mkdirSync(dirname(out), { recursive: true });
    await sharp(Buffer.from(svg))
      .png()
      .toFile(out);
    console.log(`[icon]  ${p.path}`);
    count++;
  }

  console.log(`\nGenerated ${count} placeholder asset(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
