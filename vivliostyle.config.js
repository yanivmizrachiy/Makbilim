// @ts-check
import { defineConfig } from '@vivliostyle/cli';

export default defineConfig({
  title: 'זוויות בין ישרים מקבילים',
  author: 'יניב רז',
  language: 'he',
  size: 'A4',
  workspaceDir: '.vivliostyle',
  viteConfigFile: false,
  vite: {
    base: '/',
  },
  static: {
    '/': 'dist',
    '/__vivliostyle-viewer/assets': 'dist/assets',
    '/__vivliostyle-viewer/generated': 'dist/generated',
    '/__vivliostyle-viewer/vendor': 'dist/vendor',
  },
  entry: ['/index.html'],
  output: 'artifacts/pdf/זוויות-בין-ישרים-מקבילים.pdf',
});
