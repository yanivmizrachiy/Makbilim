import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const main = read('src/main.tsx');
const baseCss = read('src/styles/print.css');
const premiumCss = read('src/styles/premium-layout.css');
const page = read('src/components/A4Page.tsx');
const question = read('src/components/QuestionBlock.tsx');

describe('premium workbook layout contract', () => {
  it('preserves the canonical A4 dimensions in the base print contract', () => {
    expect(baseCss).toContain('size: A4 portrait');
    expect(baseCss).toContain('width: 210mm');
    expect(baseCss).toContain('height: 297mm');
    expect(premiumCss).not.toContain('width: 210mm');
    expect(premiumCss).not.toContain('height: 297mm');
  });

  it('loads the premium layer last so it remains non-destructive and isolated', () => {
    expect(main).toContain("import './styles/premium-layout.css';");
    expect(main.indexOf('geometry-premium.css')).toBeLessThan(main.indexOf('premium-layout.css'));
  });

  it('keeps canonical page and question DOM contracts while exposing premium hooks', () => {
    expect(page).toContain('data-layout-quality="premium"');
    expect(page).toContain('data-page={pageNumber}');
    expect(question).toContain('data-question-surface="premium"');
    expect(question).toContain('globalQuestionNumber(taskId)');
    expect(question).toContain('className="subpart-marker"');
  });

  it('supports print, monochrome and forced-color output structurally', () => {
    expect(premiumCss).toContain('@media print');
    expect(premiumCss).toContain('@media print and (monochrome)');
    expect(premiumCss).toContain('@media (forced-colors: active)');
    expect(premiumCss).toContain('repeating-linear-gradient');
  });

  it('upgrades page chrome, question surfaces, answer areas and tables without student copy', () => {
    for (const selector of [
      '.page-header',
      '.question-block',
      '.question-diagram',
      '.answer-lines',
      '.justification-lane',
      '.data-table',
      '.page-footer',
    ]) {
      expect(premiumCss).toContain(selector);
    }
    expect(premiumCss).not.toMatch(/placeholder|demo|sample/i);
  });
});
