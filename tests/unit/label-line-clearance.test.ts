import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import App from '../../src/App';
import { segmentNearRect, type Rect, type Segment } from '../../src/geometry/core';
import { shapeLabel } from '../../src/geometry/label-font';
import { ParallelLinesDiagram } from '../../src/geometry/ParallelLinesDiagram';
import { ThreeLinesDiagram } from '../../src/geometry/ThreeLinesDiagram';
import { geometryTokens as T } from '../../src/styles/tokens';

/**
 * SPEC 10.3 — "אסור: תווית על קו". EVERY label of every diagram in the student booklet — line
 * names AND angle names / values, in the two-line and the three-line diagrams — keeps clear of
 * every drawn line by at least the placement clearance. Measured on the real rendered SVG: the
 * label's ink box is rebuilt from the label face's glyph metrics at its printed size.
 */

const PX_PER_MM = 96 / 25.4;
const PX_PER_PT = 96 / 72;
/** Clearance between a label's ink (with its halo) and the centre line of any drawn line. */
const CLEARANCE = (T.placement.lineClearanceMm + T.stroke.lineMm / 2) * PX_PER_MM - 0.05;

const num = (value: string | undefined) => Number(value ?? Number.NaN);
const decode = (text: string) => text.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&');

type Label = { kind: string; text: string; x: number; baseline: number; fontPx: number };

function drawnLines(svg: string): Segment[] {
  const group = /<g class="geometry-lines">([\s\S]*?)<\/g>/.exec(svg)?.[1] ?? '';
  return [...group.matchAll(/<line x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)"/g)]
    .map(m => ({ a: { x: num(m[1]), y: num(m[2]) }, b: { x: num(m[3]), y: num(m[4]) } }));
}

function labels(svg: string): Label[] {
  return [...svg.matchAll(/<text class="(line-label-text|angle-label-text(?: angle-label-text--index)?)" x="([^"]+)" y="([^"]+)"[^>]*data-label="([^"]*)"/g)]
    .map(m => ({
      kind: m[1] ?? '',
      text: decode(m[4] ?? ''),
      x: num(m[2]),
      baseline: num(m[3]),
      fontPx: (m[1]!.includes('index') ? T.label.indexPt : m[1] === 'line-label-text' ? T.label.linePt : T.label.anglePt) * PX_PER_PT,
    }));
}

/** Glyph ink of a label plus its halo — what must not touch a line. */
function inkBox(label: Label): Rect {
  const shaped = shapeLabel(label.text);
  const halo = (T.label.haloMm / 2) * PX_PER_MM;
  const half = (shaped.width / 2) * label.fontPx;
  return {
    left: label.x - half - halo,
    right: label.x + half + halo,
    top: label.baseline - shaped.yMax * label.fontPx - halo,
    bottom: label.baseline - shaped.yMin * label.fontPx + halo,
  };
}

function labelsTouchingLines(svg: string): string[] {
  const segments = drawnLines(svg);
  return labels(svg)
    .filter(label => segments.some(segment => segmentNearRect(segment, inkBox(label), CLEARANCE)))
    .map(label => `"${label.text}" at (${label.x.toFixed(1)}, ${label.baseline.toFixed(1)})`);
}

const diagramsOf = (html: string) => [...html.matchAll(/<svg class="geometry-diagram[\s\S]*?<\/svg>/g)].map(m => m[0]);
/** The whole student booklet, rendered once (laying out every diagram is the expensive part). */
const booklet = renderToStaticMarkup(createElement(App));

describe('labels never sit on a drawn line (SPEC 10.3)', () => {
  it('detects a label on a line (self-check of the measurement)', () => {
    const onLine = '<g class="geometry-lines"><line x1="0" y1="100" x2="400" y2="100"></line></g>'
      + '<text class="line-label-text" x="200" y="104" text-anchor="middle" data-label="t">t</text>'
      + '<text class="angle-label-text" x="200" y="140" text-anchor="middle" data-label="(4x + 6)°">x</text>';
    expect(labelsTouchingLines(onLine)).toEqual(['"t" at (200.0, 104.0)']);
  });

  it('keeps every label beside its line in a steep diagram', () => {
    const svg = renderToStaticMarkup(createElement(ParallelLinesDiagram, {
      lineLabels: ['h', 'k'], transversalLabel: 's', orientationDeg: -21, transversalDeg: 48,
      angleMarks: [{ intersection: 'top', sector: 0, value: '(2x + 38)°' }, { intersection: 'bottom', sector: 2, label: 'α' }],
    }));
    expect(labels(svg)).toHaveLength(5);
    expect(labelsTouchingLines(svg)).toEqual([]);
  });

  it('keeps the three-lines diagram labels (line names and angles) off its lines', () => {
    const svg = renderToStaticMarkup(createElement(ThreeLinesDiagram, {
      orientationDeg: 12,
      transversalDeg: 57,
      angleMarks: [
        { line: 0, label: 'A', side: 'left' },
        { line: 1, label: 'B', side: 'left' },
        { line: 2, label: 'C', side: 'left' },
      ],
    }));
    expect(labels(svg)).toHaveLength(7);
    expect(labelsTouchingLines(svg)).toEqual([]);
  });

  it('holds for every label of every diagram in the student booklet', () => {
    const svgs = diagramsOf(booklet);
    expect(svgs.length).toBeGreaterThan(50);
    expect(svgs.filter(svg => svg.includes('three-lines-diagram')).length).toBeGreaterThan(0);
    const angleLabels = svgs.flatMap(svg => labels(svg)).filter(label => label.kind.startsWith('angle-label-text'));
    expect(angleLabels.length).toBeGreaterThan(80);
    const offenders = svgs.flatMap((svg, index) => labelsTouchingLines(svg).map(where => `diagram #${index + 1}: ${where}`));
    expect(offenders).toEqual([]);
  });
});
