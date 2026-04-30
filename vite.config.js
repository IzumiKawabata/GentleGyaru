import { defineConfig } from 'vite';
import { readFileSync, writeFileSync, unlinkSync, readdirSync, statSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { join, extname, dirname, relative } from 'path';
import { randomBytes } from 'crypto';
import sharp from 'sharp';

/**
 * Vite Plugin: assets/ を dist/assets/ にコピー（SmartDoll 流用）
 */
function copyAssetsPlugin() {
  return {
    name: 'copy-assets',
    writeBundle() {
      const srcDir = join(process.cwd(), 'assets');
      const destDir = join(process.cwd(), 'dist', 'assets');
      let copied = 0;

      function walkAndCopy(dir) {
        let entries;
        try { entries = readdirSync(dir); } catch { return; }
        for (const entry of entries) {
          const srcPath = join(dir, entry);
          try {
            const s = statSync(srcPath);
            if (s.isDirectory()) {
              walkAndCopy(srcPath);
            } else {
              if (entry.startsWith('.')) continue;
              const rel = relative(srcDir, srcPath);
              const destPath = join(destDir, rel);
              mkdirSync(dirname(destPath), { recursive: true });
              copyFileSync(srcPath, destPath);
              copied++;
            }
          } catch { /* skip */ }
        }
      }

      if (existsSync(srcDir)) {
        walkAndCopy(srcDir);
        console.log(`[copy-assets] Copied ${copied} files from assets/ to dist/`);
      }
    },
  };
}

/**
 * Vite Plugin: dist 内画像をリサイズ＋再圧縮（SmartDoll 流用）
 */
function optimizeImagesPlugin({
  maxWidth = 1440,
  webpQuality = 80,
  jpegQuality = 82,
  minSizeForOptimize = 20 * 1024,
  skipDirs = ['icons'],
} = {}) {
  const IMAGE_EXTS = new Set(['.webp', '.png', '.jpg', '.jpeg']);

  return {
    name: 'optimize-images',
    async writeBundle() {
      const distDir = join(process.cwd(), 'dist');
      const files = [];

      function walk(dir) {
        let entries;
        try { entries = readdirSync(dir); } catch { return; }
        for (const entry of entries) {
          const fp = join(dir, entry);
          try {
            const s = statSync(fp);
            if (s.isDirectory()) walk(fp);
            else if (IMAGE_EXTS.has(extname(entry).toLowerCase())) files.push(fp);
          } catch { /* skip */ }
        }
      }
      walk(distDir);

      let totalBefore = 0;
      let totalAfter = 0;
      let skippedTiny = 0;
      let skippedAnimated = 0;
      let processed = 0;

      for (const fp of files) {
        try {
          const relFromDist = relative(distDir, fp).replace(/\\/g, '/');
          const before = statSync(fp).size;
          totalBefore += before;

          if (skipDirs.some((d) => relFromDist.startsWith(d + '/') || relFromDist.startsWith(d))) {
            totalAfter += before;
            continue;
          }
          if (before < minSizeForOptimize) { totalAfter += before; skippedTiny++; continue; }

          const ext = extname(fp).toLowerCase();
          const rawBuf = readFileSync(fp);

          if (ext === '.webp') {
            try {
              const meta = await sharp(rawBuf, { animated: true }).metadata();
              if ((meta.pages || 1) > 1) { totalAfter += before; skippedAnimated++; continue; }
            } catch { totalAfter += before; continue; }
          }
          if (ext === '.png') { totalAfter += before; continue; }

          let pipeline = sharp(rawBuf).resize(maxWidth, null, { withoutEnlargement: true, fit: 'inside' });
          if (ext === '.webp') pipeline = pipeline.webp({ quality: webpQuality });
          else if (ext === '.jpg' || ext === '.jpeg') pipeline = pipeline.jpeg({ quality: jpegQuality });
          const buf = await pipeline.toBuffer();
          writeFileSync(fp, buf);
          totalAfter += buf.length;
          processed++;
        } catch (err) {
          console.warn(`[optimize-images] Skip ${fp}: ${err.message}`);
          try { totalAfter += statSync(fp).size; } catch { /* ignore */ }
        }
      }

      const saved = totalBefore > 0 ? ((1 - totalAfter / totalBefore) * 100).toFixed(0) : '0';
      console.log(
        `[optimize-images] processed=${processed} / skipped: tiny=${skippedTiny}, animated=${skippedAnimated} / ` +
        `${(totalBefore / 1024 / 1024).toFixed(1)}MB → ${(totalAfter / 1024 / 1024).toFixed(1)}MB (-${saved}%)`
      );
    },
  };
}

/**
 * Vite Plugin: メディアアセットを XOR 暗号化（SmartDoll 流用、v1 では OFF）
 */
function encryptAssetsPlugin() {
  const ENCRYPTED_EXTS = new Set(['.webp', '.png', '.jpg', '.jpeg', '.mp3', '.wav', '.ogg']);
  let assetKey = '';

  return {
    name: 'encrypt-assets',
    enforce: 'post',

    config(config, { command }) {
      if (command === 'build') {
        assetKey = randomBytes(16).toString('hex');
        return {
          define: {
            'import.meta.env.VITE_ASSET_KEY': JSON.stringify(assetKey),
          },
        };
      }
    },

    closeBundle() {
      if (!assetKey) return;

      const distDir = join(process.cwd(), 'dist');
      const keyBytes = Buffer.from(assetKey, 'utf-8');
      let encrypted = 0;

      function walkDir(dir) {
        let entries;
        try { entries = readdirSync(dir); } catch { return; }
        for (const entry of entries) {
          const fullPath = join(dir, entry);
          let stat;
          try { stat = statSync(fullPath); } catch { continue; }
          if (stat.isDirectory()) {
            if (entry === 'icons') continue;
            walkDir(fullPath);
          } else if (ENCRYPTED_EXTS.has(extname(entry).toLowerCase())) {
            try {
              const data = readFileSync(fullPath);
              const result = Buffer.alloc(data.length);
              for (let i = 0; i < data.length; i++) {
                result[i] = data[i] ^ keyBytes[i % keyBytes.length];
              }
              writeFileSync(fullPath + '.enc', result);
              unlinkSync(fullPath);
              encrypted++;
            } catch (err) {
              console.warn(`[encrypt-assets] Failed: ${fullPath}: ${err.message}`);
            }
          }
        }
      }

      walkDir(distDir);
      console.log(`[encrypt-assets] Encrypted ${encrypted} files with key length ${assetKey.length}`);
    },
  };
}

/**
 * Vite Plugin: sw.js の CACHE_VERSION をビルド毎に上書き（SmartDoll 流用）
 */
function bustSwCachePlugin() {
  return {
    name: 'bust-sw-cache',
    enforce: 'post',
    closeBundle() {
      const swPath = join(process.cwd(), 'dist', 'sw.js');
      if (!existsSync(swPath)) return;
      const version = Date.now().toString(36);
      const src = readFileSync(swPath, 'utf-8');
      const patched = src.replace(
        /const CACHE_VERSION = [^;]+;/,
        `const CACHE_VERSION = '${version}';`
      );
      if (src === patched) {
        console.warn('[bust-sw-cache] CACHE_VERSION pattern not matched in sw.js');
        return;
      }
      writeFileSync(swPath, patched);
      console.log(`[bust-sw-cache] sw.js CACHE_VERSION → '${version}'`);
    },
  };
}

export default defineConfig({
  base: './',
  build: {
    emptyOutDir: true,
  },
  server: {
    host: true,
  },
  define: {
    'import.meta.env.VITE_DEBUG': JSON.stringify(
      process.env.VERCEL_ENV === 'preview' ? 'true' : ''
    ),
  },
  plugins: [
    copyAssetsPlugin(),
    optimizeImagesPlugin({
      maxWidth: 1440,
      webpQuality: 80,
      jpegQuality: 82,
      minSizeForOptimize: 20 * 1024,
      skipDirs: ['icons'],
    }),
    // v1 では encryptAssetsPlugin は OFF（SmartDoll と同じ判断）
    // SecureAssetLoader をシーンに組み込んでから再有効化
    // encryptAssetsPlugin(),
    bustSwCachePlugin(),
  ],
});
