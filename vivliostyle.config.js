// @ts-check
import { defineConfig } from '@vivliostyle/cli';

export default defineConfig({
  title: 'זוויות בין ישרים מקבילים',
  author: 'יניב רז',
  language: 'he',
  size: 'A4',
  workspaceDir: '.vivliostyle',
  viteConfigFile: false,
  static: {
    '/': 'artifacts/vivliostyle',
    '/assets': 'dist/assets',
  },
  entry: ['/index.html'],
  output: 'artifacts/pdf/זוויות-בין-ישרים-מקבילים.pdf',
});
