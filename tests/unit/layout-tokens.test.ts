import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { A4Page } from '../../src/components/A4Page';
import { RULE_POOL } from '../../src/components/AnswerArea';
import pageManifest from '../../src/content/page-manifest.json';
import { PAGE_DENSITY, pageDensity } from '../../src/content/page-layout';
import { printTokens } from '../../src/styles/tokens';
import { findAll, hasClass, parseMarkup, visibleText } from './markup-tree';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const tokensCss = read('src/styles/tokens.css');
const printCss = read('src/styles/print.css');
const premiumCss = read('src/styles/premium-layout.css');
const tuningCss = read('src/styles/page-tuning.css');
const bbbCss = read('src/styles/bbb-source.css');
const main = read('src/main.tsx');

const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Every `selector { declarations }` rule with its declarations (nested at-rules flattened). */
function rules(css: string): Array<{ selector: string; declarations: Array<[string, string]> }> {
  const out: Array<{ selector: string; declarations: Array<[string, string]> }> = [];
  for (const match of stripComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = match[1]!.trim().replace(/^@[^{]*$/, '');
    const declarations = match[2]!
      .split(';')
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => {
        const colon = part.indexOf(':');
        return [part.slice(0, colon).trim(), part.slice(colon + 1).trim()] as [string, string];
      });
    out.push({ selector, declarations });
  }
  return out;
}

/** mm value of a length token in a declaration list (only mm lengths are used for these tokens). */
const mmOf = (value: string) => Number(/^([\d.]+)mm$/.exec(value)?.[1]);

/** The base token values: the first :root block (later :root blocks are print / forced-colors mappings). */
const baseTokens = () => new Map(rules(tokensCss).find(rule => rule.selector === ':root')!.declarations);

/** SVG label and stroke rules still in print.css are owned by the geometry layer, not the page type scale. */
const GEOMETRY_SELECTOR = /geometry|angle-mark|parallel-mark/;

describe('one design-token system (src/styles/tokens.css)', () => {
  it('loads the token sheet before every other stylesheet', () => {
    const tokenImport = main.indexOf("import './styles/tokens.css';");
    expect(tokenImport).toBeGreaterThan(-1);
    expect(tokenImport).toBeLessThan(main.indexOf("import App from './App';"));
    for (const sheet of ['bbb-source.css', 'page-tuning.css', 'geometry-premium.css', 'premium-layout.css']) {
      expect(tokenImport).toBeLessThan(main.indexOf(sheet));
    }
  });

  it('defines custom properties ONLY in tokens.css (and density presets): the page and answer sheets only read them', () => {
    for (const [name, css] of [['print.css', printCss], ['premium-layout.css', premiumCss], ['bbb-source.css', bbbCss]] as const) {
      const defined = rules(css).flatMap(rule => rule.declarations.filter(([property]) => property.startsWith('--')).map(([property]) => `${rule.selector} ${property}`));
      expect(defined, `${name} defines tokens`).toEqual([]);
    }
  });

  it('keeps page-tuning.css to density presets that set custom properties only', () => {
    const offending = rules(tuningCss).flatMap(rule =>
      rule.declarations.filter(([property]) => !property.startsWith('--')).map(([property]) => `${rule.selector} { ${property} }`),
    );
    expect(offending).toEqual([]);
    for (const rule of rules(tuningCss)) expect(rule.selector).toMatch(/^\.a4-page\[data-density="[a-z]+"\]$/);
  });

  it('never tunes a single page by its unit/page number in any layout sheet', () => {
    for (const css of [printCss, premiumCss, tuningCss]) {
      expect(stripComments(css)).not.toMatch(/\[data-page=/);
    }
  });

  it('keeps one handwriting pitch: 8mm by default, never below 7mm in any preset, rule-to-separator clearance ≥ 3mm', () => {
    const tokens = baseTokens();
    expect(mmOf(tokens.get('--rule-pitch') ?? '')).toBe(8);
    expect(mmOf(tokens.get('--work-clearance') ?? '')).toBeGreaterThanOrEqual(3);
    expect(tokens.get('--rule-style')).toBe('dotted');
    for (const rule of rules(tuningCss)) {
      for (const [property, value] of rule.declarations) {
        if (property === '--rule-pitch') expect(mmOf(value), rule.selector).toBeGreaterThanOrEqual(7);
        if (property === '--work-clearance') expect(mmOf(value), rule.selector).toBeGreaterThanOrEqual(3);
      }
    }
    // The rule pool covers a whole content area at the smallest pitch, so growth is never capped.
    expect(RULE_POOL * 7).toBeGreaterThanOrEqual(260);
  });

  it('draws writing rules lighter than the question separator, and never with gradients (forced colors drop them)', () => {
    const tokens = baseTokens();
    const luminance = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    // Rules stay visible on paper, but are clearly lighter than the solid separator.
    expect(luminance(tokens.get('--rule-color')!)).toBeLessThan(0.72);
    expect(luminance(tokens.get('--q-sep-color')!)).toBeLessThan(luminance(tokens.get('--rule-color')!) - 0.1);
    expect(mmOf(tokens.get('--rule-w') ?? '')).toBeLessThanOrEqual(0.25);
    const ruleCss = rules(printCss).filter(rule => /\.rule\b|answer-lines/.test(rule.selector));
    expect(ruleCss.flatMap(rule => rule.declarations).filter(([, value]) => /gradient/.test(value))).toEqual([]);
  });

  it('uses two text sizes for what students read (body, secondary) instead of per-component literals', () => {
    const tokens = baseTokens();
    expect(tokens.get('--text-body')).toBe('11.7pt');
    expect(tokens.get('--text-secondary')).toBe('11pt');
    const sizes = rules(printCss).filter(rule => !GEOMETRY_SELECTOR.test(rule.selector)).flatMap(rule => rule.declarations.filter(([property]) => property === 'font-size').map(([, value]) => value));
    expect(sizes.filter(value => !value.startsWith('var(--'))).toEqual([]);
  });

  it('removes the direction:ltr flip hack: the split grid is a native RTL grid', () => {
    expect(stripComments(tuningCss)).not.toMatch(/direction/);
    const split = rules(printCss).filter(rule => rule.selector.includes('question-content--split'));
    expect(split.flatMap(rule => rule.declarations).filter(([property]) => property === 'direction')).toEqual([]);
  });

  it('never breaks an answer option into flex items', () => {
    const choice = rules(printCss).find(rule => rule.selector === '.choice');
    expect(choice?.declarations).toContainEqual(['display', 'grid']);
  });
});

describe('density presets (src/content/page-layout.ts)', () => {
  it('names only real pages and known presets, and A4Page writes the preset to data-density', () => {
    const pages = new Set([...pageManifest.originalUnits.flatMap(unit => unit.pageNumbers.map(page => `U${unit.unit}-P${page}`))]);
    for (const [key, density] of Object.entries(PAGE_DENSITY)) {
      expect(pages.has(key), key).toBe(true);
      expect(['regular', 'dense']).toContain(density);
      expect(tuningCss).toContain(`[data-density="${density}"]`);
    }
    const pageId = Object.keys(PAGE_DENSITY)[0]!;
    const markup = renderToStaticMarkup(createElement(A4Page, { pageId, children: null }));
    expect(markup).toContain(`data-density="${pageDensity(pageId)}"`);
    expect(pageDensity('C-P1')).toBe('regular');
  });
});

describe('page header and footer', () => {
  // U2-P4 is global page 12 (curriculum 1–4, unit-1 5–8, U2-P1..P3 9–11), topic "אלגברה".
  const markup = renderToStaticMarkup(createElement(A4Page, { pageId: 'U2-P4', children: null }));
  const tree = parseMarkup(markup);
  const text = (className: string) => visibleText(findAll(tree, node => hasClass(node, className))[0]!).trim();

  it('keeps every header and footer text exactly as the visual baseline compares it', () => {
    expect(visibleText(findAll(tree, node => node.tag === 'h1')[0]!).trim()).toBe('זוויות בין ישרים מקבילים');
    expect(text('topic-title')).toBe('אלגברה');
    expect(text('page-number')).toBe('12');
    const footer = findAll(tree, node => hasClass(node, 'page-footer'))[0]!;
    expect(findAll(footer, node => node.tag === 'div').map(node => visibleText(node).trim())).toEqual([
      printTokens.footer.line1,
      printTokens.footer.line2,
    ]);
  });

  it('lets the unit lead: the unit title is larger than the running head, which is quiet', () => {
    const tokens = baseTokens();
    const pt = (name: string) => Number(/^([\d.]+)pt$/.exec(tokens.get(name) ?? '')?.[1]);
    expect(pt('--unit-title-size')).toBeGreaterThanOrEqual(13);
    expect(pt('--unit-title-size')).toBeLessThanOrEqual(14);
    expect(pt('--running-head-size')).toBeGreaterThanOrEqual(8.6);
    expect(pt('--running-head-size')).toBeLessThanOrEqual(8.8);
    expect(pt('--page-number-size')).toBeGreaterThanOrEqual(10);
    expect(pt('--page-number-size')).toBeLessThanOrEqual(11);
    expect(mmOf(tokens.get('--header-height') ?? '')).toBeGreaterThanOrEqual(13);
    expect(mmOf(tokens.get('--header-height') ?? '')).toBeLessThanOrEqual(15);
  });

  it('draws a square-ended accent tick under the unit title, not a rounded pill', () => {
    const tick = rules(premiumCss).find(rule => rule.selector.endsWith('.page-header::after') && rule.declarations.some(([p]) => p === 'content'));
    expect(tick).toBeDefined();
    expect(tick!.declarations).toContainEqual(['inset-inline-start', '0']);
    expect(tick!.declarations.some(([property]) => property === 'border-radius')).toBe(false);
    expect(stripComments(premiumCss)).not.toMatch(/999px/);
  });
});

describe('unit 5 frame', () => {
  it('draws no wrapper separator between the two verbatim source blocks, and squares the source cards', () => {
    const block = rules(bbbCss).find(rule => rule.selector === '.bbb-source-block');
    expect(block).toBeDefined();
    expect(block!.declarations.some(([property]) => property.startsWith('border'))).toBe(false);
    const card = rules(bbbCss).find(rule => rule.selector === '.bbb-source .q');
    expect(card!.declarations).toContainEqual(['border-radius', '0']);
  });
});
