import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json')) as {
  scripts: Record<string, string>;
  devDependencies: Record<string, string>;
};
const config = read('vivliostyle.config.js');
const buildPdf = read('scripts/build-pdf.mjs');
const crosscheck = read('scripts/validate-pdf-crosscheck.mjs');
const printCss = read('src/styles/print.css');
const pdfScript = pkg.scripts.pdf ?? '';

describe('dual-engine publication pipeline contract', () => {
  it('pins Vivliostyle and runs both PDF renderers before cross-check', () => {
    expect(pkg.devDependencies['@vivliostyle/cli']).toBe('11.3.3');
    expect(pkg.scripts['pdf:chromium']).toContain('build-pdf.mjs');
    expect(pkg.scripts['pdf:vivliostyle']).toBe('vivliostyle build');
    expect(pkg.scripts['pdf:crosscheck']).toContain('validate-pdf-crosscheck.mjs');
    expect(pdfScript.indexOf('pdf:chromium')).toBeLessThan(pdfScript.indexOf('pdf:vivliostyle'));
    expect(pdfScript.indexOf('pdf:vivliostyle')).toBeLessThan(pdfScript.indexOf('pdf:crosscheck'));
  });

  it('typesets the static Vite build as canonical A4 through Vivliostyle', () => {
    expect(config).toContain("size: 'A4'");
    expect(config).toContain("'/': 'dist'");
    expect(config).toContain("entry: ['/index.html']");
    expect(config).toContain("output: 'artifacts/pdf/זוויות-בין-ישרים-מקבילים.pdf'");
  });

  it('keeps Chromium as an independent renderer and visual QA engine', () => {
    expect(buildPdf).toContain('זוויות-בין-ישרים-מקבילים-chromium.pdf');
    expect(buildPdf).toContain("forcedColors: 'active'");
    expect(buildPdf).toContain('geometryCollisionCount');
    expect(buildPdf).toContain('geometryOutOfBoundsCount');
    expect(buildPdf).toContain("screenshotPageSet('color')");
    expect(buildPdf).toContain("screenshotPageSet('grayscale')");
    expect(buildPdf).toContain("screenshotPageSet('forced-colors')");
  });

  it('cross-checks exactly 19 A4 pages in both PDF engines', () => {
    expect(crosscheck).toContain('const EXPECTED_PAGES = 19');
    expect(crosscheck).toContain("inspect(canonicalPath, 'vivliostyle')");
    expect(crosscheck).toContain("inspect(chromiumPath, 'chromium')");
    expect(crosscheck).toContain('PDF renderer page-count mismatch');
    expect(crosscheck).toContain('non-A4 pages');
  });

  it('preserves deliberate print color while retaining non-color redundancy', () => {
    expect(printCss).toContain('print-color-adjust: exact');
    expect(printCss).toContain('-webkit-print-color-adjust: exact');
  });
});
