import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const parallel = read('src/geometry/ParallelLinesDiagram.tsx');
const threeLines = read('src/geometry/ThreeLinesDiagram.tsx');
const premiumCss = read('src/styles/geometry-premium.css');
const main = read('src/main.tsx');

describe('premium geometry rendering contract', () => {
  it('renders semantic vector angle sectors, arcs, labels and intersections', () => {
    expect(parallel).toContain('data-geometry-quality="premium"');
    expect(parallel).toContain('angle-sector-fill');
    expect(parallel).toContain('angle-label-plate');
    expect(parallel).toContain('geometry-line-underlay');
    expect(parallel).toContain('geometry-intersections');
    expect(parallel).toContain('parallel-mark--chevrons');
  });

  it('upgrades the three-line authored geometry engine too', () => {
    expect(threeLines).toContain('data-geometry-quality="premium"');
    expect(threeLines).toContain('geometry-line-underlay');
    expect(threeLines).toContain('geometry-intersections');
    expect(threeLines).toContain('parallel-mark--chevrons');
    expect(threeLines).toContain('angle-callout');
    expect(threeLines).toContain('angle-badge');
  });

  it('keeps premium geometry vector-based and print aware', () => {
    expect(parallel).toContain('<svg');
    expect(threeLines).toContain('<svg');
    expect(parallel).toContain('shapeRendering="geometricPrecision"');
    expect(threeLines).toContain('shapeRendering="geometricPrecision"');
    expect(premiumCss).toContain('vector-effect: non-scaling-stroke');
    expect(premiumCss).toContain('@media print');
    expect(premiumCss).toContain('@media (forced-colors: active)');
  });

  it('distinguishes angle relations by more than color alone', () => {
    expect(premiumCss).toContain('.angle-mark--secondary .angle-arc');
    expect(premiumCss).toContain('stroke-dasharray');
    expect(parallel).toContain("arcStyle?: 'single' | 'double' | 'dashed'");
  });

  it('loads the premium geometry layer after the base page styles', () => {
    expect(main).toContain("import './styles/geometry-premium.css';");
    expect(main.indexOf("page-tuning.css")).toBeLessThan(main.indexOf("geometry-premium.css"));
  });
});
