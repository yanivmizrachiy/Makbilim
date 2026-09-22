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
  },
  entry: ['/index.html'],
  output: 'artifacts/pdf/זוויות-בין-ישרים-מקבילים.pdf',
});
