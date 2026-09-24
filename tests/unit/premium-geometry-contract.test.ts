import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ParallelLinesDiagram } from '../../src/geometry/ParallelLinesDiagram';
import { ThreeLinesDiagram } from '../../src/geometry/ThreeLinesDiagram';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

/** Stylesheets without comments, so rule matching sees selectors and declarations only. */
const css = (file: string) => read(file).replace(/\/\*[\s\S]*?\*\//g, '');
// The --geo-* tokens (and their print / forced-colors overrides) live in tokens.css.
const premiumCss = css('src/styles/tokens.css') + '\n' + css('src/styles/geometry-premium.css');
const printCss = css('src/styles/print.css');
const pageTuning = css('src/styles/page-tuning.css');
const main = read('src/main.tsx');

const parallel = renderToStaticMarkup(createElement(ParallelLinesDiagram, {
  orientationDeg: 6,
  transversalDeg: 63,
  angleMarks: [
    { intersection: 'top', sector: 0, role: 'given', value: '68°' },
    { intersection: 'bottom', sector: 0, role: 'target', label: 'α' },
    { intersection: 'bottom', sector: 1, role: 'auxiliary', label: 'B' },
  ],
}));
const threeLines = renderToStaticMarkup(createElement(ThreeLinesDiagram, {
  orientationDeg: 12,
  transversalDeg: 57,
  angleMarks: [
    { line: 0, label: 'A', side: 'left', role: 'marked' },
    { line: 1, label: 'B', side: 'left', role: 'marked' },
    { line: 2, label: 'C', side: 'left', role: 'target' },
  ],
}));

/** The declarations of the (first) CSS rule whose selector list is exactly `selector`. */
function rule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
}

describe('premium geometry rendering contract', () => {
  it('draws textbook figures: real arcs, solid crossing dots, chevrons and haloed text labels — no chips, underlays or spilling fills', () => {
    for (const svg of [parallel, threeLines]) {
      expect(svg).toContain('data-geometry-quality="premium"');
      expect(svg).toContain('data-label-placement="collision-aware"');
      expect(svg).toContain('class="geometry-intersections"');
      expect(svg).toContain('parallel-mark--chevrons');
      expect(svg).toContain('class="angle-arc angle-arc--inner"');
      expect(svg).toContain('class="angle-label-text"');
      expect(svg).toContain('class="line-label-text"');
      for (const retired of ['angle-label-plate', 'geometry-line-underlay', 'angle-sector-fill', 'angle-badge', 'angle-callout', '<rect']) {
        expect(svg).not.toContain(retired);
      }
    }
    // Solid dots: no ring around the crossing.
    expect(rule(premiumCss, '.geometry-diagram .geometry-intersections circle')).toMatch(/stroke:\s*none/);
  });

  it('builds both diagram engines on the same layout engine and primitives', () => {
    for (const file of ['src/geometry/ParallelLinesDiagram.tsx', 'src/geometry/ThreeLinesDiagram.tsx']) {
      const source = read(file);
      expect(source).toContain('layoutFigure(');
      expect(source).toContain('<Figure');
      expect(source).toContain('useDiagramSize(');
    }
  });

  it('keeps geometry vector-based, at a fixed physical scale, and print / forced-colors aware', () => {
    for (const svg of [parallel, threeLines]) {
      expect(svg).toContain('shape-rendering="geometricPrecision"');
      // Intrinsic size = viewBox size: one user unit is one CSS px, so mm / pt CSS lengths are physical.
      const [, , vbWidth, vbHeight] = (/viewBox="([^"]+)"/.exec(svg)?.[1] ?? '').split(' ').map(Number);
      expect(Number(/ width="([^"]+)"/.exec(svg)?.[1])).toBe(vbWidth);
      expect(Number(/ height="([^"]+)"/.exec(svg)?.[1])).toBe(vbHeight);
    }
    expect(rule(premiumCss, '.geometry-diagram .geometry-lines line')).toContain('stroke-width: var(--geo-stroke-line)');
    expect(premiumCss).toContain('@media print and (monochrome)');
    expect(premiumCss).toContain('@media (forced-colors: active)');
  });

  it('distinguishes angle roles by arc FORM, and dashes only the dashed form (never a colour)', () => {
    expect(parallel).toMatch(/data-angle-role="target"[^>]*>(?:(?!<\/g>).)*angle-arc--outer/);
    expect(parallel).toMatch(/class="angle-mark angle-mark--neutral angle-mark--dashed"/);
    const dashRules = [...premiumCss.matchAll(/([^{}]+)\{[^}]*stroke-dasharray[^}]*\}/g)].map(m => m[1]!.trim());
    expect(dashRules).toEqual(['.geometry-diagram .angle-mark--dashed .angle-arc']);
    expect(premiumCss).not.toMatch(/\.angle-mark--secondary[^{]*\{[^}]*dasharray/);
    expect(rule(premiumCss, '.geometry-diagram .angle-arc')).toContain('stroke-linecap: butt');
    expect(read('src/geometry/ParallelLinesDiagram.tsx')).toContain("arcStyle?: 'single' | 'double' | 'dashed'");
  });

  it('keeps geometry.css the ONLY stylesheet for diagrams (no duplicate rules or per-page diagram heights)', () => {
    for (const sheet of [printCss, pageTuning]) {
      expect(sheet).not.toMatch(/\.geometry-diagram|\.angle-mark|\.geometry-lines|\.geometry-labels|\.parallel-mark/);
      expect(sheet).not.toMatch(/--diagram-(compact|full)-height/);
    }
  });

  it('loads the premium geometry layer after the base page styles', () => {
    expect(main).toContain("import './styles/geometry-premium.css';");
    expect(main.indexOf('page-tuning.css')).toBeLessThan(main.indexOf('geometry-premium.css'));
  });
});
