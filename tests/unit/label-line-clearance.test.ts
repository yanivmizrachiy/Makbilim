import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import App from '../../src/App';
import { estimateLabelRect, LABEL_INK_BOX, segmentNearRect, type Segment } from '../../src/geometry/core';
import { ParallelLinesDiagram } from '../../src/geometry/ParallelLinesDiagram';

/**
 * SPEC 10.3 — "אסור: תווית על קו". Every line / transversal label of every two-line diagram in
 * the student booklet must keep clear of every drawn line. Measured on the real rendered SVG.
 */

// The engine's own ink-box definition: "on a line" means ink touching ink.
const LINE_LABEL_BOX = LABEL_INK_BOX;
const CLEARANCE = 1;

const num = (value: string | undefined) => Number(value ?? Number.NaN);

function labelsTouchingLines(svg: string): string[] {
  const linesGroup = /<g class="geometry-lines">([\s\S]*?)<\/g>/.exec(svg)?.[1] ?? '';
  const segments: Segment[] = [...linesGroup.matchAll(/<line x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)"/g)]
    .map(m => ({ a: { x: num(m[1]), y: num(m[2]) }, b: { x: num(m[3]), y: num(m[4]) } }));
  const labelsGroup = /<g class="geometry-labels"[^>]*>([\s\S]*?)<\/g>/.exec(svg)?.[1] ?? '';
  const labels = [...labelsGroup.matchAll(/<text x="([^"]+)" y="([^"]+)"[^>]*>([^<]*)<\/text>/g)]
    .map(m => ({ point: { x: num(m[1]), y: num(m[2]) }, text: m[3] ?? '' }));
  return labels
    .filter(label => segments.some(segment => segmentNearRect(segment, estimateLabelRect(label.point, label.text, LINE_LABEL_BOX), CLEARANCE)))
    .map(label => `"${label.text}" at (${label.point.x.toFixed(1)}, ${label.point.y.toFixed(1)})`);
}

describe('labels never sit on a drawn line (SPEC 10.3)', () => {
  it('detects a label on a line (self-check of the measurement)', () => {
    const onLine = '<g class="geometry-lines"><line x1="0" y1="100" x2="400" y2="100" /></g><g class="geometry-labels" aria-hidden="true" direction="ltr"><text x="200" y="100">t</text></g>';
    expect(labelsTouchingLines(onLine)).toHaveLength(1);
  });

  it('keeps the transversal label beside its line in a steep diagram', () => {
    const svg = renderToStaticMarkup(createElement(ParallelLinesDiagram, {
      lineLabels: ['h', 'k'], transversalLabel: 's', orientationDeg: -21, transversalDeg: 48,
    }));
    expect(labelsTouchingLines(svg)).toEqual([]);
  });

  it('holds for every two-line diagram in the student booklet', () => {
    const html = renderToStaticMarkup(createElement(App));
    const svgs = [...html.matchAll(/<svg class="geometry-diagram[\s\S]*?<\/svg>/g)].map(m => m[0])
      .filter(svg => svg.includes('class="geometry-labels"') && !svg.includes('three-line'));
    expect(svgs.length).toBeGreaterThan(20);
    const offenders = svgs.flatMap((svg, index) => labelsTouchingLines(svg).map(where => `diagram #${index + 1}: ${where}`));
    expect(offenders).toEqual([]);
  });
});
