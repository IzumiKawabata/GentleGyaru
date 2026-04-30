import type { CapacitorConfig } from '@capacitor/cli';

// ⚠️ パッケージ名は OPEN_QUESTIONS.md #9 で別名義確定後に更新する
// 暫定値（別名義決定までの placeholder）
const config: CapacitorConfig = {
  appId: 'com.gentlegal.app',
  appName: 'Gentle Gal',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
