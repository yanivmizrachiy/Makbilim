import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { unit1Questions } from '../../src/content/questions-unit1';
import {
  ParallelLinesDiagram,
  type AngleMark,
  type ParallelLinesDiagramProps,
} from '../../src/geometry/ParallelLinesDiagram';
import { Unit1Continuation } from '../../src/pages/Unit1Continuation';
import { arcTrimDeg, mm } from '../../src/geometry/engine';
import { geometryTokens } from '../../src/styles/tokens';

/*
 * Geometry-level contract for genuinely NON-parallel counterexample diagrams.
 * Everything is measured from the rendered SVG coordinates (not from the
 * props), so the assertions check what a student actually sees on paper.
 */

type Point = { x: number; y: number };
type Segment = { a: Point; b: Point };
type Ray = { deg: number; kind: 'line' | 'transversal' };
type Arc = { start: Point; end: Point; radius: number };

/**
 * Arcs are drawn at the physical arc radius (a larger one for acute angles), and their butt
 * ends are trimmed exactly to the edge of the drawn line: arcTrimDeg(radius) inside each ray.
 */
const ARC_RADII = [mm(geometryTokens.arc.radiusMm), mm(geometryTokens.arc.radiusMm + geometryTokens.arc.acuteBoostMm)];
/** Arc end points are serialised with 3 decimals at radius ≥ 17 px → ≤ 0.01° error. */
const ARC_TOLERANCE_DEG = 0.02;

const render = (props: ParallelLinesDiagramProps) =>
  renderToStaticMarkup(createElement(ParallelLinesDiagram, props));

function groupBody(markup: string, className: string): string {
  const start = markup.indexOf(`<g class="${className}"`);
  if (start < 0) throw new Error(`missing <g class="${className}">`);
  return markup.slice(start, markup.indexOf('</g>', start));
}

function numAttr(attrs: string, name: string): number {
  const match = new RegExp(`\\s${name}="([^"]+)"`).exec(` ${attrs}`);
  const value = Number(match?.[1]);
  if (!match || !Number.isFinite(value)) throw new Error(`missing numeric ${name} in ${attrs}`);
  return value;
}

/** [top line, bottom line, primary transversal, secondary transversal?] */
function parseLines(markup: string): Segment[] {
  return [...groupBody(markup, 'geometry-lines').matchAll(/<line\s([^>]*?)\/?>/g)].map(match => {
    const attrs = match[1] ?? '';
    return {
      a: { x: numAttr(attrs, 'x1'), y: numAttr(attrs, 'y1') },
      b: { x: numAttr(attrs, 'x2'), y: numAttr(attrs, 'y2') },
    };
  });
}

/** [top, bottom, top-secondary?, bottom-secondary?] intersection dots. */
function parseIntersections(markup: string): Point[] {
  return [...groupBody(markup, 'geometry-intersections').matchAll(/<circle\s([^>]*?)\/?>/g)].map(match => {
    const attrs = match[1] ?? '';
    return { x: numAttr(attrs, 'cx'), y: numAttr(attrs, 'cy') };
  });
}

/** Inner arcs, in the same order as the angleMarks prop. */
function parseInnerArcs(markup: string): Arc[] {
  const pattern = /class="angle-arc angle-arc--inner" d="M (\S+) (\S+) A (\S+) \S+ 0 [01] 1 (\S+) (\S+)"/g;
  return [...markup.matchAll(pattern)].map(match => ({
    start: { x: Number(match[1]), y: Number(match[2]) },
    radius: Number(match[3]),
    end: { x: Number(match[4]), y: Number(match[5]) },
  }));
}

/** The drawing's own viewBox: the whole visible figure. */
function parseViewBox(markup: string) {
  const [x, y, width, height] = (/viewBox="([^"]+)"/.exec(markup)?.[1] ?? '').split(' ').map(Number);
  if (![x, y, width, height].every(Number.isFinite)) throw new Error('missing viewBox');
  return { x: x!, y: y!, width: width!, height: height! };
}

const countParallelMarks = (markup: string) => (markup.match(/class="parallel-mark /g) ?? []).length;
const norm360 = (deg: number) => ((deg % 360) + 360) % 360;
/** Signed smallest difference a − b, in (−180, 180]. */
const angleDiff = (a: number, b: number) => 180 - norm360(180 - (a - b));
const dirDeg = (from: Point, to: Point) => (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
const segmentDeg = (segment: Segment) => dirDeg(segment.a, segment.b);
/** Signed difference between two undirected line directions, in (−90, 90]. */
function lineDiff(a: number, b: number) {
  const d = norm360(a - b) % 180;
  return d > 90 ? d - 180 : d;
}

function distanceToLine(point: Point, segment: Segment) {
  const dx = segment.b.x - segment.a.x;
  const dy = segment.b.y - segment.a.y;
  return Math.abs(dy * (point.x - segment.a.x) - dx * (point.y - segment.a.y)) / Math.hypot(dx, dy);
}

function infiniteLineIntersection(first: Segment, second: Segment): Point | null {
  const r = { x: first.b.x - first.a.x, y: first.b.y - first.a.y };
  const s = { x: second.b.x - second.a.x, y: second.b.y - second.a.y };
  const denominator = r.x * s.y - r.y * s.x;
  if (Math.abs(denominator) < 1e-12) return null;
  const t = ((second.a.x - first.a.x) * s.y - (second.a.y - first.a.y) * s.x) / denominator;
  return { x: first.a.x + t * r.x, y: first.a.y + t * r.y };
}

const insideViewBox = (point: Point, markup: string) => {
  const box = parseViewBox(markup);
  return point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height;
};

function raysAt(line: Segment, transversal: Segment): Ray[] {
  const lineDeg = segmentDeg(line);
  const transversalDeg = segmentDeg(transversal);
  return [
    { deg: norm360(lineDeg), kind: 'line' },
    { deg: norm360(lineDeg + 180), kind: 'line' },
    { deg: norm360(transversalDeg), kind: 'transversal' },
    { deg: norm360(transversalDeg + 180), kind: 'transversal' },
  ];
}

/**
 * Identifies the real angle an arc marks: the two ADJACENT rays at `center`
 * that bound it. Fails unless the arc is centred on the intersection, is drawn at
 * one of the physical arc radii, starts exactly arcTrimDeg(r) after one ray (at the
 * edge of the drawn line), ends exactly as far before the next ray, and no other
 * ray passes through the marked sector.
 */
function markedAngle(center: Point, arc: Arc, rays: Ray[]) {
  expect(ARC_RADII.some(radius => Math.abs(radius - arc.radius) < 0.001)).toBe(true);
  expect(Math.hypot(arc.start.x - center.x, arc.start.y - center.y)).toBeCloseTo(arc.radius, 1);
  expect(Math.hypot(arc.end.x - center.x, arc.end.y - center.y)).toBeCloseTo(arc.radius, 1);
  const trim = arcTrimDeg(arc.radius);
  const startDeg = dirDeg(center, arc.start);
  const endDeg = dirDeg(center, arc.end);
  const from = rays.find(ray => Math.abs(angleDiff(startDeg - trim, ray.deg)) < ARC_TOLERANCE_DEG);
  const to = rays.find(ray => Math.abs(angleDiff(endDeg + trim, ray.deg)) < ARC_TOLERANCE_DEG);
  if (!from || !to) {
    throw new Error(
      `arc ${startDeg.toFixed(2)}°→${endDeg.toFixed(2)}° is not bounded by the rays at this intersection ` +
      `(${rays.map(ray => `${ray.kind}@${ray.deg.toFixed(2)}`).join(', ')})`,
    );
  }
  const span = norm360(to.deg - from.deg);
  expect(span).toBeGreaterThan(0);
  expect(span).toBeLessThan(180);
  for (const ray of rays) {
    if (ray === from || ray === to) continue;
    // No other ray may lie strictly inside the swept sector.
    expect(norm360(ray.deg - from.deg)).toBeGreaterThan(span);
  }
  expect(new Set([from.kind, to.kind])).toEqual(new Set(['line', 'transversal']));
  const lineRay = from.kind === 'line' ? from : to;
  const transversalRay = from.kind === 'transversal' ? from : to;
  return { span, lineRay, transversalRay };
}

type Config = { orientationDeg: number; transversalDeg: number; skew: number };

const SKEW_CONFIGS: Config[] = [
  { orientationDeg: -9, transversalDeg: 68, skew: 8 }, // U1-P3-A counterexample
  { orientationDeg: 16, transversalDeg: 62, skew: -8 }, // U1-P3-D counterexample
  { orientationDeg: -4, transversalDeg: 71, skew: 9 }, // bottom line crosses the 0° seam
  { orientationDeg: 84, transversalDeg: 29, skew: -10 }, // near-vertical pair
  { orientationDeg: 0, transversalDeg: 118, skew: 7 },
  { orientationDeg: 31, transversalDeg: 122, skew: 20 }, // maximum allowed skew
];

describe('ParallelLinesDiagram — second-line skew (genuinely non-parallel pairs)', () => {
  it('draws two lines with equal slope when there is no skew, byte-identical to omitting the prop', () => {
    const base = { lineLabels: ['p', 'q'] as [string, string], orientationDeg: 13, transversalDeg: 73, showParallelMarks: true };
    const markup = render(base);
    expect(render({ ...base, secondLineSkewDeg: 0 })).toBe(markup);
    const [top, bottom] = parseLines(markup);
    expect(Math.abs(lineDiff(segmentDeg(bottom!), segmentDeg(top!)))).toBeLessThan(1e-9);
    expect(countParallelMarks(markup)).toBe(2);
    expect(markup).not.toContain('data-line-relation');
    expect(markup).toContain('aria-label="שרטוט של שני ישרים מקבילים וישר חותך"');
  });

  it.each(SKEW_CONFIGS)('rotates the bottom line by the skew (%o)', ({ orientationDeg, transversalDeg, skew }) => {
    const markup = render({ orientationDeg, transversalDeg, secondLineSkewDeg: skew });
    const [top, bottom, transversal] = parseLines(markup);
    expect(segmentDeg(top!)).toBeCloseTo(orientationDeg, 9);
    expect(lineDiff(segmentDeg(bottom!), segmentDeg(top!))).toBeCloseTo(skew, 9);
    // The pair converges visibly but never meets inside the drawing.
    const meeting = infiniteLineIntersection(top!, bottom!);
    expect(meeting).not.toBeNull();
    expect(insideViewBox(meeting!, markup)).toBe(false);
    // Each intersection dot lies exactly on its own line and on the transversal.
    const [topDot, bottomDot] = parseIntersections(markup);
    expect(distanceToLine(topDot!, top!)).toBeLessThan(1e-6);
    expect(distanceToLine(topDot!, transversal!)).toBeLessThan(1e-6);
    expect(distanceToLine(bottomDot!, bottom!)).toBeLessThan(1e-6);
    expect(distanceToLine(bottomDot!, transversal!)).toBeLessThan(1e-6);
  });

  it('rejects explicit parallel marks on a skewed pair instead of silently dropping them', () => {
    expect(() => render({ orientationDeg: 0, transversalDeg: 62, showParallelMarks: true, secondLineSkewDeg: 8 })).toThrow(RangeError);
    expect(() => render({ orientationDeg: 0, transversalDeg: 62, showParallelMarks: false, secondLineSkewDeg: 8 })).not.toThrow();
  });

  it('never draws parallel chevrons or parallel wording for a skewed pair', () => {
    const markup = render({ orientationDeg: 0, transversalDeg: 62, secondLineSkewDeg: 8 });
    expect(countParallelMarks(markup)).toBe(0);
    expect(markup).toContain('data-line-relation="non-parallel"');
    expect(markup).toContain('data-second-line-skew="8"');
    const ariaLabel = /aria-label="([^"]*)"/.exec(markup)?.[1] ?? '';
    const title = /<title>([^<]*)<\/title>/.exec(markup)?.[1] ?? '';
    const desc = /<desc>([^<]*)<\/desc>/.exec(markup)?.[1] ?? '';
    for (const text of [ariaLabel, title, desc]) {
      expect(text).toContain('שאינם מקבילים');
      expect(text).not.toMatch(/ישרים מקבילים|סימוני מקבילות/);
    }
  });

  it.each(SKEW_CONFIGS)(
    'puts every bottom-intersection mark on the correct angle of the bottom line (%o)',
    ({ orientationDeg, transversalDeg, skew }) => {
      for (const sector of [0, 1, 2, 3] as const) {
        const angleMarks: AngleMark[] = [
          { intersection: 'top', sector },
          { intersection: 'bottom', sector },
          { intersection: 'bottom', sector: ((sector + 2) % 4) as AngleMark['sector'] },
        ];
        const markup = render({ orientationDeg, transversalDeg, secondLineSkewDeg: skew, angleMarks });
        const [top, bottom, transversal] = parseLines(markup);
        const [topDot, bottomDot] = parseIntersections(markup);
        const [topArc, bottomArc, bottomOppositeArc] = parseInnerArcs(markup);

        // Arcs are bounded by the rays of the line that ACTUALLY passes through
        // each intersection (the old engine used the top line's direction here).
        const topAngle = markedAngle(topDot!, topArc!, raysAt(top!, transversal!));
        const bottomAngle = markedAngle(bottomDot!, bottomArc!, raysAt(bottom!, transversal!));
        const bottomOpposite = markedAngle(bottomDot!, bottomOppositeArc!, raysAt(bottom!, transversal!));

        // Same sector index = corresponding position: same transversal ray, and
        // the bottom line ray points the same way as the top one, turned by the skew.
        expect(angleDiff(bottomAngle.transversalRay.deg, topAngle.transversalRay.deg)).toBeCloseTo(0, 6);
        expect(angleDiff(bottomAngle.lineRay.deg, topAngle.lineRay.deg)).toBeCloseTo(skew, 6);

        // Corresponding (top k / bottom k) and alternate (top k / bottom k+2)
        // angles differ by exactly |skew| — visibly NOT equal.
        expect(Math.abs(topAngle.span - bottomAngle.span)).toBeCloseTo(Math.abs(skew), 6);
        expect(Math.abs(topAngle.span - bottomOpposite.span)).toBeCloseTo(Math.abs(skew), 6);
        // Vertical angles at the bottom intersection stay equal.
        expect(bottomOpposite.span).toBeCloseTo(bottomAngle.span, 6);
      }
    },
  );

  it('keeps corresponding and alternate angles equal when the lines are parallel', () => {
    for (const sector of [0, 1, 2, 3] as const) {
      const markup = render({
        orientationDeg: -9,
        transversalDeg: 68,
        angleMarks: [
          { intersection: 'top', sector },
          { intersection: 'bottom', sector },
          { intersection: 'bottom', sector: ((sector + 2) % 4) as AngleMark['sector'] },
        ],
      });
      const [top, bottom, transversal] = parseLines(markup);
      const [topDot, bottomDot] = parseIntersections(markup);
      const [topArc, bottomArc, bottomOppositeArc] = parseInnerArcs(markup);
      const topSpan = markedAngle(topDot!, topArc!, raysAt(top!, transversal!)).span;
      expect(markedAngle(bottomDot!, bottomArc!, raysAt(bottom!, transversal!)).span).toBeCloseTo(topSpan, 6);
      expect(markedAngle(bottomDot!, bottomOppositeArc!, raysAt(bottom!, transversal!)).span).toBeCloseTo(topSpan, 6);
    }
  });

  it('recomputes the secondary-transversal intersections and marks on the skewed line', () => {
    const skew = -9;
    for (const sector of [0, 1, 2, 3] as const) {
      const markup = render({
        orientationDeg: 6,
        transversalDeg: 64,
        secondaryTransversalDeg: 118,
        secondLineSkewDeg: skew,
        angleMarks: [
          { intersection: 'top-secondary', sector },
          { intersection: 'bottom-secondary', sector },
        ],
      });
      const [top, bottom, , secondary] = parseLines(markup);
      const [, , topSecondaryDot, bottomSecondaryDot] = parseIntersections(markup);
      expect(distanceToLine(bottomSecondaryDot!, bottom!)).toBeLessThan(1e-6);
      expect(distanceToLine(bottomSecondaryDot!, secondary!)).toBeLessThan(1e-6);
      const [topArc, bottomArc] = parseInnerArcs(markup);
      const topAngle = markedAngle(topSecondaryDot!, topArc!, raysAt(top!, secondary!));
      const bottomAngle = markedAngle(bottomSecondaryDot!, bottomArc!, raysAt(bottom!, secondary!));
      expect(angleDiff(bottomAngle.lineRay.deg, topAngle.lineRay.deg)).toBeCloseTo(skew, 6);
      expect(Math.abs(topAngle.span - bottomAngle.span)).toBeCloseTo(Math.abs(skew), 6);
    }
  });

  it('rejects skews that would scramble the angle sectors or cross the lines inside the drawing', () => {
    // Lines at 0° and a transversal at 20° leave a 20° gap: an 8° skew fits the
    // 12° clearance, a 9° skew does not.
    expect(() => render({ orientationDeg: 0, transversalDeg: 20, secondLineSkewDeg: 8 })).not.toThrow();
    expect(() => render({ orientationDeg: 0, transversalDeg: 20, secondLineSkewDeg: 9 })).toThrow(RangeError);
    expect(() => render({ orientationDeg: 0, transversalDeg: 90, secondLineSkewDeg: 21 })).toThrow(RangeError);
    expect(() => render({ orientationDeg: 0, transversalDeg: 90, secondLineSkewDeg: Number.NaN })).toThrow(RangeError);
    expect(() =>
      render({ orientationDeg: 0, transversalDeg: 90, secondaryTransversalDeg: 10, secondLineSkewDeg: 8 }),
    ).toThrow(RangeError);
  });
});

describe('Unit 1 teaching pairs — one parallel configuration, one NOT', () => {
  const markup = renderToStaticMarkup(createElement(Unit1Continuation));
  const sections = markup.split('<section ').slice(1);
  // The question's own section (its stem may be split into math islands, so find it by task id).
  const sectionOf = (id: string) => {
    if (!unit1Questions.some(item => item.id === id)) throw new Error(`Missing unit 1 question: ${id}`);
    return `data-task-id="${id}"`;
  };

  it.each(['U1-P3-A', 'U1-P3-D'])('%s pairs a parallel diagram with a genuinely non-parallel one', id => {
    const pairSections = sections.filter(section => section.includes('class="paired-diagrams"') && section.includes(sectionOf(id)));
    expect(pairSections).toHaveLength(1);
    // Only the two figures inside .paired-diagrams (the question may also hold a comic with avatar SVGs).
    const paired = /class="paired-diagrams">([\s\S]*?)<\/div>/.exec(pairSections[0]!)?.[1] ?? '';
    const svgs = paired.split('<svg').slice(1);
    expect(svgs).toHaveLength(2);
    const [parallelSvg, skewedSvg] = svgs as [string, string];

    // The parallel configuration: equal slopes, marked parallel.
    const [pTop, pBottom] = parseLines(parallelSvg);
    expect(Math.abs(lineDiff(segmentDeg(pBottom!), segmentDeg(pTop!)))).toBeLessThan(1e-9);
    expect(countParallelMarks(parallelSvg)).toBe(2);
    expect(parallelSvg).not.toContain('data-line-relation');

    // The counterexample: a clearly visible, tasteful skew — not merely unmarked.
    const skew = Number(/data-second-line-skew="([^"]+)"/.exec(skewedSvg)?.[1]);
    expect(Math.abs(skew)).toBeGreaterThanOrEqual(7);
    expect(Math.abs(skew)).toBeLessThanOrEqual(10);
    expect(skewedSvg).toContain('data-line-relation="non-parallel"');
    expect(countParallelMarks(skewedSvg)).toBe(0);
    const [sTop, sBottom, sTransversal] = parseLines(skewedSvg);
    expect(lineDiff(segmentDeg(sBottom!), segmentDeg(sTop!))).toBeCloseTo(skew, 9);
    const meeting = infiniteLineIntersection(sTop!, sBottom!);
    expect(insideViewBox(meeting!, skewedSvg)).toBe(false);
    // The transversal still visibly cuts both drawn lines.
    for (const line of [sTop!, sBottom!]) {
      const cut = infiniteLineIntersection(line, sTransversal!)!;
      expect(insideViewBox(cut, skewedSvg)).toBe(true);
      expect(Math.min(line.a.x, line.b.x) - 1e-9).toBeLessThanOrEqual(cut.x);
      expect(Math.max(line.a.x, line.b.x) + 1e-9).toBeGreaterThanOrEqual(cut.x);
    }
  });

  it('skews only those two counterexamples; relation-table rows stay drawn parallel ("not given")', () => {
    expect((markup.match(/data-line-relation="non-parallel"/g) ?? [])).toHaveLength(2);
    const table = sections.find(section => section.includes('relation-table'));
    expect(table).toBeDefined();
    const tableSvgs = table!.split('<svg').slice(1);
    expect(tableSvgs).toHaveLength(4);
    for (const svg of tableSvgs) {
      const [top, bottom] = parseLines(svg);
      expect(Math.abs(lineDiff(segmentDeg(bottom!), segmentDeg(top!)))).toBeLessThan(1e-9);
      expect(svg).not.toContain('data-line-relation');
    }
  });
});
