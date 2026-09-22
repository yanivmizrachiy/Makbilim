// @ts-check
import { defineConfig } from '@vivliostyle/cli';

export default defineConfig({
  title: 'זוויות בין ישרים מקבילים',
  author: 'יניב רז',
  language: 'he',
  size: 'A4',
  workspaceDir: '.vivliostyle',
  viteConfigFile: false,
  entry: ['artifacts/vivliostyle/index.html'],
  entryContext: '.',
  static: {
    '/assets': 'dist/assets',
  },
  output: 'artifacts/pdf/זוויות-בין-ישרים-מקבילים.pdf',
});
