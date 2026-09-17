import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const component = read('src/geometry/ParallelLinesDiagram.tsx');
const premiumCss = read('src/styles/geometry-premium.css');
const main = read('src/main.tsx');

describe('premium geometry rendering contract', () => {
  it('renders semantic vector angle sectors, arcs, labels and intersections', () => {
    expect(component).toContain('data-geometry-quality="premium"');
    expect(component).toContain('angle-sector-fill');
    expect(component).toContain('angle-label-plate');
    expect(component).toContain('geometry-line-underlay');
    expect(component).toContain('geometry-intersections');
    expect(component).toContain('parallel-mark--chevrons');
  });

  it('keeps premium geometry vector-based and print aware', () => {
    expect(component).toContain('<svg');
    expect(component).toContain('shapeRendering="geometricPrecision"');
    expect(premiumCss).toContain('vector-effect: non-scaling-stroke');
    expect(premiumCss).toContain('@media print');
    expect(premiumCss).toContain('@media (forced-colors: active)');
  });

  it('distinguishes angle relations by more than color alone', () => {
    expect(premiumCss).toContain('.angle-mark--secondary .angle-arc');
    expect(premiumCss).toContain('stroke-dasharray');
    expect(component).toContain("arcStyle?: 'single' | 'double' | 'dashed'");
  });

  it('loads the premium geometry layer after the base page styles', () => {
    expect(main).toContain("import './styles/geometry-premium.css';");
    expect(main.indexOf("page-tuning.css")).toBeLessThan(main.indexOf("geometry-premium.css"));
  });
});
