import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  baselineDrift,
  pageHealthIssues,
  reportHealthIssues,
  type LayoutPage,
  type LayoutReport,
} from '../../scripts/lib/visual-baseline-contract.mjs';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const healthyPage = (unit: number, localPage: number): LayoutPage => ({
  pageId: `U${unit}-P${localPage}`,
  globalPage: localPage,
  usedSpanRatio: 0.978,
  scrollOverflow: 0,
  overflowingQuestions: 0,
  internallyOverflowingQuestions: 0,
  geometryCollisionCount: 0,
  geometryOutOfBoundsCount: 0,
  unlabeledGeometrySvgCount: 0,
  headerContentOverlap: false,
  footerContentOverlap: false,
  questionCount: 4,
  widthPx: 793.6875,
  heightPx: 1122.515625,
  topGapRatio: 0.0167,
  bottomGapRatio: 0.0048,
  maxInterQuestionGapRatio: 0.017,
  footerLines: ['line 1', 'line 2'],
});

const healthyReport = (): LayoutReport => ({
  pageCount: 21,
  mathJaxStatus: { total: 10, rendered: 10, svgNodes: 10 },
  layout: Array.from({ length: 21 }, (_, index) => healthyPage(1, index + 1)),
});

describe('visual baseline contract', () => {
  it('accepts a healthy page and report', () => {
    expect(pageHealthIssues(healthyPage(1, 1))).toEqual([]);
    expect(reportHealthIssues(healthyReport())).toEqual([]);
  });

  it('rejects content running past the page content area (the overflow that was once baselined)', () => {
    const issues = pageHealthIssues({ ...healthyPage(1, 4), usedSpanRatio: 1.0326 });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('U1-P4');
    expect(issues[0]).toContain('runs past the page content area');
  });

  it('rejects collisions, out-of-bounds geometry, clipping and header/footer overlap', () => {
    expect(pageHealthIssues({ ...healthyPage(2, 1), geometryCollisionCount: 1 })).toHaveLength(1);
    expect(pageHealthIssues({ ...healthyPage(2, 1), geometryOutOfBoundsCount: 2 })).toHaveLength(1);
    expect(pageHealthIssues({ ...healthyPage(2, 1), overflowingQuestions: 1 })).toHaveLength(1);
    expect(pageHealthIssues({ ...healthyPage(2, 1), footerContentOverlap: true })).toHaveLength(1);
    expect(pageHealthIssues({ ...healthyPage(2, 1), headerContentOverlap: true })).toHaveLength(1);
  });

  it('rejects an incomplete MathJax render or a wrong page count', () => {
    expect(reportHealthIssues({ ...healthyReport(), mathJaxStatus: { total: 10, rendered: 9, svgNodes: 9 } })).toHaveLength(1);
    expect(reportHealthIssues({ ...healthyReport(), pageCount: 18 }).length).toBeGreaterThan(0);
  });

  it('reports drift only beyond the explicit tolerances and on exact structural keys', () => {
    const baseline = healthyReport();
    expect(baselineDrift(baseline, healthyReport())).toEqual([]);

    const withinTolerance = healthyReport();
    withinTolerance.layout[0] = { ...healthyPage(1, 1), usedSpanRatio: 0.978 + 0.01 };
    expect(baselineDrift(baseline, withinTolerance)).toEqual([]);

    const beyondTolerance = healthyReport();
    beyondTolerance.layout[0] = { ...healthyPage(1, 1), usedSpanRatio: 0.978 - 0.05 };
    expect(baselineDrift(baseline, beyondTolerance).join('\n')).toContain('usedSpanRatio drift');

    const structural = healthyReport();
    structural.layout[0] = { ...healthyPage(1, 1), questionCount: 5 };
    expect(baselineDrift(baseline, structural).join('\n')).toContain('questionCount changed from 4 to 5');
  });

  it('keeps the committed canonical baseline itself healthy (a defect can never be baselined)', () => {
    const committed = JSON.parse(read('qa/visual-baseline.json')) as LayoutReport;
    expect(reportHealthIssues(committed)).toEqual([]);
  });

  it('shares one contract between the CI gate and the re-baseline tool', () => {
    for (const script of ['scripts/validate-visual-baseline.mjs', 'scripts/update-visual-baseline.mjs']) {
      expect(read(script)).toContain("from './lib/visual-baseline-contract.mjs'");
    }
    expect(read('scripts/update-visual-baseline.mjs')).toContain("process.argv.includes('--accept')");
  });
});
