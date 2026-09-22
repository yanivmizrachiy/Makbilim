// @ts-check
import { defineConfig } from '@vivliostyle/cli';

export default defineConfig({
  title: 'זוויות בין ישרים מקבילים',
  author: 'יניב רז',
  language: 'he',
  size: 'A4',
  workspaceDir: '.vivliostyle',
  entry: ['dist/index.html'],
  entryContext: '.',
  static: {
    '/': 'dist',
  },
  viteConfigFile: false,
  output: 'artifacts/pdf/זוויות-בין-ישרים-מקבילים.pdf',
});
