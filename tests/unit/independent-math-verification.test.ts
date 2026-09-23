/**
 * SPEC 14 — אימות מתמטי בלתי־תלוי.
 *
 * Every computational original task (units 2 and 4) is re-solved here BY HAND from the
 * givens in its stem. Nothing in this file imports or reuses a content solver, an
 * `expected` value, or `src/geometry/relations.ts` to compute an answer: the answers are
 * literal arithmetic written below, and the content's `expected` block is only the thing
 * being checked.
 *
 * Drawing ↔ data consistency is verified against the RENDERED SVG, not against the
 * sector-index code that produced it. Each page is rendered with react-dom/server; the
 * diagram components are wrapped (not replaced) so the props a page passes are captured
 * next to the real SVG those props produce. From the SVG alone this file reads the drawn
 * lines, finds every marked angle's vertex and bounding rays, measures its size, and
 * classifies each pair of marked angles (corresponding / alternate / vertical / adjacent)
 * from first principles.
 *
 * Content issues found by this suite are listed below. A test that exercises one of them
 * is declared with `it.fails(...)` and cites the issue id, so the suite stays honest: it
 * passes today because the content is wrong, and it will start FAILING as soon as the
 * content is fixed — at which point the integrator flips it back to `it(...)`.
 *
 * CI-1  U2-P2-D  ∠A = α = 54° (acute) but every marked sector is drawn at 99° (obtuse).
 * CI-2  U2-P4-C  the marked angles evaluate to 93° (obtuse) but are drawn at 45° (acute).
 * CI-3  U2-P4-D  the marked angles evaluate to 71° (acute) but are drawn at 129° (obtuse).
 * CI-4  U2-P5-C  (2y + 18)° = 94° (obtuse) and its alternate 94° are drawn at 68° (acute).
 * CI-5  U2-P5-D  (2x + 20)° = 70° is drawn at 112° and (3x + 35)° = 110° at 68° — swapped.
 * CI-6  U2-P6-B  the 118° angle and its alternate are drawn at 45° (acute).
 * CI-7  U2-P6-C  ∠A = 128° is drawn at 43°; α = 52° is drawn at 137° — swapped.
 * CI-8  U2-P6-D  ∠C = 68° is drawn at 120°; β = 112° is drawn at 60° — swapped.
 * CI-9  U3-P3-C  the redundant datum ∠E = 35° is drawn at 115° (obtuse).
 * CI-10 U4-P2-A  ∠C = ∠D = 112° (obtuse) are drawn at 49° (acute).
 *               (CI-1…CI-10 violate SPEC 10.3: „שרטוט שמטעה לגבי זווית חדה/קהה” is forbidden.)
 * CI-11 U3-P3-D  the content claims ∠A and ∠C are NOT an alternate pair; in the drawing
 *               (and necessarily: corresponding + vertical ⇒ alternate) they ARE alternate
 *               interior angles, so the teacher-key reason for rejecting „הוכחה ב” is false.
 * CI-12 U3-P1-C  ∠A and ∠C label the very same drawn angle (same vertex, same sector).
 * CI-13 U4-P2-D  collision-aware placement pushes the ∠C badge across line r: its callout
 *               points at −18° (line r runs at 12°, t at 57°), i.e. into the angle ABOVE r,
 *               which is same-side interior with ∠B — not the angle corresponding to ∠B that
 *               the stem and the proof („∠B ו־∠C הן זוויות מתאימות ביחס לישרים q ו־r”) use.
 *
 * Observations that are locked as passing assertions (not certain errors):
 * - U2-P3-B is the only direct-theorem computation whose parallel condition is given solely
 *   by the drawing's parallel marks; its stem never says k ∥ m.
 * - The unit-4 converse reasons (U4-P1-D, U4-P2-A) match SPEC 3.2 except for the comma after
 *   „שלישי”; they are compared modulo commas.
 *
 * Unit-3 proofs are not computational, but every relation they rely on is checked against the
 * drawing the same way.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { THEOREMS, THEOREM_GUARDRAILS } from '../../src/content/theorems';
import { unit2Questions, type Unit2Question } from '../../src/content/questions-unit2';
import { unit3Questions, type Unit3Question } from '../../src/content/questions-unit3';
import { unit4Questions, type Unit4Question } from '../../src/content/questions-unit4';
import type { AngleMark, ParallelLinesDiagramProps } from '../../src/geometry/ParallelLinesDiagram';
import type { ThreeLinesDiagramProps } from '../../src/geometry/ThreeLinesDiagram';
import { Unit2Pages } from '../../src/pages/Unit2Pages';
import { Unit3Pages } from '../../src/pages/Unit3Pages';
import { Unit4Pages } from '../../src/pages/Unit4Pages';

// ---------------------------------------------------------------------------
// Capture the props every page passes to the diagram engines, while still
// rendering the real SVG.
// ---------------------------------------------------------------------------

type CapturedDiagram =
  | { kind: 'parallel'; props: ParallelLinesDiagramProps }
  | { kind: 'three'; props: ThreeLinesDiagramProps };

const captured = vi.hoisted(() => ({ diagrams: [] as CapturedDiagram[] }));

vi.mock('../../src/geometry/ParallelLinesDiagram', async importOriginal => {
  const actual = await importOriginal<typeof import('../../src/geometry/ParallelLinesDiagram')>();
  const react = await import('react');
  return {
    ...actual,
    ParallelLinesDiagram: (props: ParallelLinesDiagramProps) => {
      captured.diagrams.push({ kind: 'parallel', props });
      return react.createElement(actual.ParallelLinesDiagram, props);
    },
  };
});

vi.mock('../../src/geometry/ThreeLinesDiagram', async importOriginal => {
  const actual = await importOriginal<typeof import('../../src/geometry/ThreeLinesDiagram')>();
  const react = await import('react');
  return {
    ...actual,
    ThreeLinesDiagram: (props: ThreeLinesDiagramProps) => {
      captured.diagrams.push({ kind: 'three', props });
      return react.createElement(actual.ThreeLinesDiagram, props);
    },
  };
});

// ---------------------------------------------------------------------------
// Plane geometry, written from scratch for this verifier.
// ---------------------------------------------------------------------------

type Pt = { x: number; y: number };
type Seg = { a: Pt; b: Pt };

const norm = (deg: number) => ((deg % 360) + 360) % 360;
const rad = (deg: number) => (deg * Math.PI) / 180;
const direction = (from: Pt, to: Pt) => norm((Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI);
const unitVector = (deg: number): Pt => ({ x: Math.cos(rad(deg)), y: Math.sin(rad(deg)) });
const dot = (u: Pt, v: Pt) => u.x * v.x + u.y * v.y;
const minus = (u: Pt, v: Pt): Pt => ({ x: u.x - v.x, y: u.y - v.y });
/** Smallest difference between two undirected line directions, in degrees. */
const lineAngleGap = (d1: number, d2: number) => {
  const diff = norm(d1 - d2) % 180;
  return Math.min(diff, 180 - diff);
};

function distanceToLine(p: Pt, s: Seg) {
  const dx = s.b.x - s.a.x;
  const dy = s.b.y - s.a.y;
  return Math.abs(dx * (p.y - s.a.y) - dy * (p.x - s.a.x)) / Math.hypot(dx, dy);
}

function intersect(s1: Seg, s2: Seg): Pt {
  const d1 = minus(s1.b, s1.a);
  const d2 = minus(s2.b, s2.a);
  const den = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(den) < 1e-9) throw new Error('parallel segments do not intersect');
  const w = minus(s2.a, s1.a);
  const t = (w.x * d2.y - w.y * d2.x) / den;
  return { x: s1.a.x + t * d1.x, y: s1.a.y + t * d1.y };
}

type Ray = { deg: number; kind: 'line' | 'trans'; side: 0 | 1 };

/** The sector (between two consecutive rays of the crossing) that contains direction `theta`. */
function locateSector(theta: number, lineDeg: number, transDeg: number) {
  const rays: Ray[] = [
    { deg: norm(lineDeg), kind: 'line' as const, side: 0 as const },
    { deg: norm(lineDeg + 180), kind: 'line' as const, side: 1 as const },
    { deg: norm(transDeg), kind: 'trans' as const, side: 0 as const },
    { deg: norm(transDeg + 180), kind: 'trans' as const, side: 1 as const },
  ].sort((a, b) => a.deg - b.deg);
  for (let i = 0; i < rays.length; i += 1) {
    const from = rays[i]!;
    const to = rays[(i + 1) % rays.length]!;
    const width = norm(to.deg - from.deg);
    const offset = norm(theta - from.deg);
    if (offset > 0 && offset < width) {
      const lineRay = from.kind === 'line' ? from : to;
      const transRay = from.kind === 'trans' ? from : to;
      if (lineRay.kind !== 'line' || transRay.kind !== 'trans') throw new Error('sector is not bounded by one line ray and one transversal ray');
      return { from, to, width, offset, lineRay, transRay, margin: Math.min(offset, width - offset) };
    }
  }
  throw new Error(`direction ${theta} lies on a ray`);
}

type DrawnAngle = {
  vertex: string;
  parallelLine: number;
  transversal: number;
  lineSide: 0 | 1;
  transSide: 0 | 1;
  interior: boolean;
  /** Drawn size of the marked angle, in degrees. */
  span: number;
  /** Text printed next to the mark in the SVG, if any. */
  label: string | null;
  /** Angular distance from the mark's pointer to the nearest bounding ray. */
  margin: number;
  /** Whether the drawn arc lies entirely inside the sector. */
  arcInside: boolean;
};

type Relation =
  | 'same'
  | 'vertical'
  | 'adjacent'
  | 'corresponding'
  | 'alternate'
  | 'alternate-exterior'
  | 'same-side'
  | 'other'
  | 'unrelated';

/** Relation between two drawn angles, decided purely from their drawn position. */
function relationOf(a: DrawnAngle, b: DrawnAngle): Relation {
  if (a.transversal !== b.transversal) return 'unrelated';
  const sameLineSide = a.lineSide === b.lineSide;
  const sameTransSide = a.transSide === b.transSide;
  if (a.parallelLine === b.parallelLine) {
    if (sameLineSide && sameTransSide) return 'same';
    if (!sameLineSide && !sameTransSide) return 'vertical';
    return 'adjacent';
  }
  if (sameLineSide && sameTransSide) return 'corresponding';
  if (!sameLineSide && !sameTransSide) {
    if (a.interior && b.interior) return 'alternate';
    if (!a.interior && !b.interior) return 'alternate-exterior';
    return 'other';
  }
  if (sameLineSide) return 'same-side';
  return 'other';
}

// ---------------------------------------------------------------------------
// Reading the rendered SVG.
// ---------------------------------------------------------------------------

const NUM = '(-?\\d+(?:\\.\\d+)?(?:e[-+]?\\d+)?)';
const LINE_RE = new RegExp(`<line x1="${NUM}" y1="${NUM}" x2="${NUM}" y2="${NUM}"`, 'g');
const FILL_RE = new RegExp(
  `<path class="angle-mark[^"]*angle-sector-fill" d="M ${NUM} ${NUM} L ${NUM} ${NUM} A ${NUM} ${NUM} 0 ([01]) 1 ${NUM} ${NUM} Z"`,
  'g',
);
const CHEVRON_RE = new RegExp(`<g class="parallel-mark parallel-mark--chevrons" transform="translate\\(${NUM} ${NUM}\\)`, 'g');
const CALLOUT_RE = new RegExp(`<line class="angle-callout" x1="${NUM}" y1="${NUM}" x2="${NUM}" y2="${NUM}"`);
const LABEL_RE = /<text class="angle-label-text"[^>]*>([^<]*)<\/text>/;

const decode = (text: string) =>
  text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&');

function drawnLines(svg: string): Seg[] {
  const start = svg.indexOf('<g class="geometry-lines">');
  const block = svg.slice(start, svg.indexOf('</g>', start));
  return [...block.matchAll(LINE_RE)].map(m => ({
    a: { x: Number(m[1]), y: Number(m[2]) },
    b: { x: Number(m[3]), y: Number(m[4]) },
  }));
}

function markChunks(svg: string) {
  return svg.split('<g class="angle-mark ').slice(1);
}

function markLabels(svg: string): Array<string | null> {
  return markChunks(svg).map(chunk => {
    const m = LABEL_RE.exec(chunk);
    return m ? decode(m[1]!) : null;
  });
}

function chevronLines(svg: string, parallels: Seg[]): number[] {
  return [...svg.matchAll(CHEVRON_RE)]
    .map(m => ({ x: Number(m[1]), y: Number(m[2]) }))
    .map(center => parallels.findIndex(line => distanceToLine(center, line) < 0.05))
    .sort((a, b) => a - b);
}

const onLine = (p: Pt, lines: Seg[]) => lines.findIndex(line => distanceToLine(p, line) < 0.05);

type Drawing = {
  kind: 'parallel' | 'three';
  svg: string;
  props: CapturedDiagram['props'];
  marks: AngleMark[];
  parallelDirs: number[];
  transversalDirs: number[];
  angles: DrawnAngle[];
  chevrons: number[];
};

function readParallelDrawing(svg: string, props: ParallelLinesDiagramProps): Drawing {
  const lines = drawnLines(svg);
  const parallels = lines.slice(0, 2);
  const transversals = lines.slice(2);
  const labels = markLabels(svg);
  const angles = [...svg.matchAll(FILL_RE)].map((m, index): DrawnAngle => {
    const vertex = { x: Number(m[1]), y: Number(m[2]) };
    const start = { x: Number(m[3]), y: Number(m[4]) };
    const end = { x: Number(m[8]), y: Number(m[9]) };
    const parallelLine = onLine(vertex, parallels);
    const transversal = onLine(vertex, transversals);
    if (parallelLine < 0 || transversal < 0) throw new Error(`mark ${index} is not drawn at a crossing`);
    const lineDeg = direction(parallels[parallelLine]!.a, parallels[parallelLine]!.b);
    const transDeg = direction(transversals[transversal]!.a, transversals[transversal]!.b);
    const thetaStart = direction(vertex, start);
    const arc = norm(direction(vertex, end) - thetaStart);
    const sector = locateSector(norm(thetaStart + arc / 2), lineDeg, transDeg);
    const startOffset = norm(thetaStart - sector.from.deg);
    const arcInside = startOffset >= -1e-6 && startOffset + arc <= sector.width + 1e-6;
    const other = intersect(parallels[1 - parallelLine]!, transversals[transversal]!);
    const interior = dot(unitVector(sector.transRay.deg), minus(other, vertex)) > 0;
    return {
      vertex: `${parallelLine === 0 ? 'top' : 'bottom'}${transversal === 1 ? '-secondary' : ''}`,
      parallelLine,
      transversal,
      lineSide: sector.lineRay.side,
      transSide: sector.transRay.side,
      interior,
      span: sector.width,
      label: labels[index] ?? null,
      margin: sector.margin,
      arcInside,
    };
  });
  return {
    kind: 'parallel',
    svg,
    props,
    marks: props.angleMarks ?? [],
    parallelDirs: parallels.map(s => direction(s.a, s.b)),
    transversalDirs: transversals.map(s => direction(s.a, s.b)),
    angles,
    chevrons: chevronLines(svg, parallels),
  };
}

function readThreeLinesDrawing(svg: string, props: ThreeLinesDiagramProps): Drawing {
  const lines = drawnLines(svg);
  const parallels = lines.slice(0, 3);
  const transversal = lines[3]!;
  const transDeg = direction(transversal.a, transversal.b);
  const angles = markChunks(svg).map((chunk, index): DrawnAngle => {
    const callout = CALLOUT_RE.exec(chunk);
    if (!callout) throw new Error(`three-line mark ${index} has no callout`);
    const vertex = { x: Number(callout[1]), y: Number(callout[2]) };
    const tip = { x: Number(callout[3]), y: Number(callout[4]) };
    const parallelLine = onLine(vertex, parallels);
    if (parallelLine < 0 || distanceToLine(vertex, transversal) > 0.05) throw new Error(`mark ${index} is not at a crossing`);
    const lineDeg = direction(parallels[parallelLine]!.a, parallels[parallelLine]!.b);
    const sector = locateSector(direction(vertex, tip), lineDeg, transDeg);
    const label = LABEL_RE.exec(chunk);
    return {
      vertex: `line-${parallelLine}`,
      parallelLine,
      transversal: 0,
      lineSide: sector.lineRay.side,
      transSide: sector.transRay.side,
      interior: false,
      span: sector.width,
      label: label ? decode(label[1]!) : null,
      margin: sector.margin,
      arcInside: true,
    };
  });
  return {
    kind: 'three',
    svg,
    props,
    marks: [],
    parallelDirs: parallels.map(s => direction(s.a, s.b)),
    transversalDirs: [transDeg],
    angles,
    chevrons: chevronLines(svg, parallels),
  };
}

type AnyQuestion = { id: string; diagram?: { orientationDeg: number; transversalDeg?: number } | undefined };

function renderDrawings(Component: () => ReturnType<typeof Unit2Pages>, questions: AnyQuestion[]) {
  captured.diagrams.length = 0;
  const html = renderToStaticMarkup(createElement(Component));
  const svgs = html
    .split('<svg class="geometry-diagram')
    .slice(1)
    .map(chunk => chunk.slice(0, chunk.indexOf('</svg>')));
  const withDiagram = questions.filter(q => q.diagram);
  if (svgs.length !== withDiagram.length || captured.diagrams.length !== withDiagram.length) {
    throw new Error(`expected ${withDiagram.length} diagrams, rendered ${svgs.length}, captured ${captured.diagrams.length}`);
  }
  const drawings = new Map<string, Drawing>();
  withDiagram.forEach((q, index) => {
    const entry = captured.diagrams[index]!;
    const svg = svgs[index]!;
    if (entry.props.orientationDeg !== q.diagram!.orientationDeg) {
      throw new Error(`${q.id}: diagram order mismatch (orientation ${entry.props.orientationDeg} ≠ ${q.diagram!.orientationDeg})`);
    }
    drawings.set(q.id, entry.kind === 'parallel' ? readParallelDrawing(svg, entry.props) : readThreeLinesDrawing(svg, entry.props));
  });
  return drawings;
}

const drawings = new Map<string, Drawing>([
  ...renderDrawings(Unit2Pages, unit2Questions),
  ...renderDrawings(Unit3Pages, unit3Questions),
  ...renderDrawings(Unit4Pages, unit4Questions),
]);

function drawingOf(id: string): Drawing {
  const drawing = drawings.get(id);
  if (!drawing) throw new Error(`no drawing rendered for ${id}`);
  return drawing;
}

// ---------------------------------------------------------------------------
// Linear algebra, written from scratch for this verifier.
// ---------------------------------------------------------------------------

type Linear = { x: number; y: number; c: number };

function parseLinear(source: string): Linear {
  const s = source.replace(/−/g, '-').replace(/°/g, '').replace(/\s+/g, '');
  let i = 0;
  const combine = (p: Linear, q: Linear, sign: 1 | -1): Linear => ({ x: p.x + sign * q.x, y: p.y + sign * q.y, c: p.c + sign * q.c });
  const term = (): Linear => {
    if (s[i] === '(') {
      i += 1;
      const inner = expression();
      if (s[i] !== ')') throw new Error(`unbalanced parenthesis in "${source}"`);
      i += 1;
      return inner;
    }
    const m = /^(\d*)([xy]?)/.exec(s.slice(i));
    const digits = m?.[1] ?? '';
    const variable = m?.[2] ?? '';
    if (!digits && !variable) throw new Error(`cannot parse "${source}" at ${i}`);
    i += digits.length + variable.length;
    const k = digits ? Number(digits) : 1;
    if (variable === 'x') return { x: k, y: 0, c: 0 };
    if (variable === 'y') return { x: 0, y: k, c: 0 };
    return { x: 0, y: 0, c: k };
  };
  const expression = (): Linear => {
    let acc = term();
    while (s[i] === '+' || s[i] === '-') {
      const sign = s[i] === '+' ? 1 : -1;
      i += 1;
      acc = combine(acc, term(), sign);
    }
    return acc;
  };
  const result = expression();
  if (i !== s.length) throw new Error(`trailing input in "${source}"`);
  return result;
}

/** `left = right` normalised to `x·X + y·Y + c = 0`. */
function parseEquation(source: string): Linear {
  const sides = source.split('=');
  if (sides.length !== 2) throw new Error(`not a single equation: "${source}"`);
  const left = parseLinear(sides[0]!);
  const right = parseLinear(sides[1]!);
  return { x: left.x - right.x, y: left.y - right.y, c: left.c - right.c };
}

const evaluate = (e: Linear, v: { x?: number; y?: number }) => e.x * (v.x ?? 0) + e.y * (v.y ?? 0) + e.c;

function equivalent(p: Linear, q: Linear) {
  const nonTrivial = [p.x, p.y].some(v => v !== 0) && [q.x, q.y].some(v => v !== 0);
  return nonTrivial && p.x * q.y === p.y * q.x && p.x * q.c === p.c * q.x && p.y * q.c === p.c * q.y;
}

/** Unique solution of a one-variable linear equation, or null when there is none / infinitely many. */
function solveOne(e: Linear): { variable: 'x' | 'y'; value: number } | null {
  if (e.x !== 0 && e.y === 0) return { variable: 'x', value: -e.c / e.x };
  if (e.y !== 0 && e.x === 0) return { variable: 'y', value: -e.c / e.y };
  return null;
}

// ---------------------------------------------------------------------------
// Theorem recognition (canonical sentences come from theorems.ts, never re-typed).
// ---------------------------------------------------------------------------

const withoutFinalPeriod = (text: string) => text.replace(/\.$/, '');
const CORRESPONDING_DIRECT = withoutFinalPeriod(THEOREMS.correspondingDirect.text);
const ALTERNATE_DIRECT = withoutFinalPeriod(THEOREMS.alternateDirect.text);

type Kind = 'corresponding' | 'alternate' | 'vertical' | 'adjacent';

function theoremKind(text: string): Kind | null {
  if (text.includes(CORRESPONDING_DIRECT)) return 'corresponding';
  if (text.includes(ALTERNATE_DIRECT)) return 'alternate';
  if (text.includes('זוויות קודקודיות שוות')) return 'vertical';
  if (text.includes('צמודות') && text.includes('180')) return 'adjacent';
  return null;
}

const asList = (value: string | string[] | undefined) => (value == null ? [] : Array.isArray(value) ? value : [value]);
const distinct = <T,>(items: T[]) => items.filter((item, index) => items.indexOf(item) === index);
const withoutCommas = (text: string) => text.replace(/,/g, '');

/**
 * SPEC 10.3 — a drawing must not mislead about acute / obtuse. A mark is inconsistent when
 * the drawn sector and the true measure lie on opposite sides of 90° and differ by more than
 * 10° (so a 87°-drawn 93° angle is tolerated, a 45°-drawn 93° angle is not).
 */
function acuteObtuseViolations(pairs: Array<{ name: string; drawn: number; measure: number }>) {
  return pairs
    .filter(({ drawn, measure }) => (drawn - 90) * (measure - 90) < 0 && Math.abs(drawn - measure) > 10)
    .map(({ name, drawn, measure }) => `${name}: measure ${measure}° but drawn as ${drawn.toFixed(1)}°`);
}

const isDegreeValue = (value: string) => /^\d+°$/.test(value);
const isExpressionValue = (value: string) => /^\(.*[xy].*\)°$/.test(value);
const bareExpression = (value: string) => value.replace(/^\(/, '').replace(/\)°$/, '');

function byId<T extends { id: string }>(list: T[], id: string): T {
  const found = list.find(item => item.id === id);
  if (!found) throw new Error(`unknown task ${id}`);
  return found;
}

// ---------------------------------------------------------------------------
// Unit 2 — hand-derived solutions.
// ---------------------------------------------------------------------------

type Step = readonly [from: string, to: string, relation: Kind | 'same'];

type Unit2Spec = {
  id: string;
  /** Literal stem text stating that the two lines are parallel (null: stated only by the drawing's parallel marks). */
  parallelText: string | null;
  /** Literal givens the hand derivation reads from the stem. */
  stemGivens: string[];
  /** Name of every drawn angle mark, in drawing order. */
  marks: string[];
  /** Geometric steps of the hand solution; each must be a real relation in the drawing. */
  steps: Step[];
  /** Angle marks that must be geometrically unrelated (redundant data). */
  unrelated?: Array<readonly [string, string]>;
  /** Mark holding the datum that is not needed. */
  unneeded?: string;
  /** Equations built from equal / supplementary angles (algebra tasks). */
  equations?: Array<{ left: string; right: string; kind: 'equal' | 'supplementary' }>;
  derive: () => { answer: Record<string, number>; measures: Record<string, number>; choice?: string };
};

const unit2Specs: Unit2Spec[] = [
  {
    id: 'U2-P1-A',
    parallelText: 'הישרים p ו־q מקבילים',
    stemGivens: ['∠A = 68°'],
    marks: ['A', 'B'],
    steps: [['A', 'B', 'corresponding']],
    derive: () => {
      const A = 68;
      const B = A; // corresponding angles, p ∥ q
      return { answer: { '∠B': B }, measures: { A, B } };
    },
  },
  {
    id: 'U2-P1-B',
    parallelText: 'הישרים k ו־m מקבילים',
    stemGivens: ['∠C = 124°'],
    marks: ['C', 'D'],
    steps: [['C', 'D', 'alternate']],
    derive: () => {
      const C = 124;
      const D = C; // alternate angles, k ∥ m
      return { answer: { '∠D': D }, measures: { C, D } };
    },
  },
  {
    id: 'U2-P1-C',
    parallelText: 'הישרים a ו־b מקבילים',
    stemGivens: ['הזווית המסומנת היא 47°'],
    marks: ['given', 'target'],
    steps: [['given', 'target', 'corresponding']],
    derive: () => {
      const given = 47;
      const target = given; // corresponding angles, a ∥ b
      return { answer: {}, measures: { given, target }, choice: `${target}°` };
    },
  },
  {
    id: 'U2-P1-D',
    parallelText: 'הישרים r ו־s מקבילים',
    stemGivens: ['∠E = 116°'],
    marks: ['E', 'α'],
    steps: [['E', 'α', 'alternate']],
    derive: () => {
      const E = 116;
      const alpha = E; // alternate angles, r ∥ s
      return { answer: { 'α': alpha }, measures: { E, 'α': alpha } };
    },
  },
  {
    id: 'U2-P2-A',
    parallelText: 'p ∥ q',
    stemGivens: ['∠A = 63°'],
    marks: ['A', 'A′', 'β'],
    steps: [['A', 'A′', 'corresponding'], ['A′', 'β', 'vertical']],
    derive: () => {
      const A = 63;
      const A2 = A; // corresponding, p ∥ q
      const beta = A2; // vertical angles
      return { answer: { 'β': beta }, measures: { A, 'A′': A2, 'β': beta } };
    },
  },
  {
    id: 'U2-P2-B',
    parallelText: 'הישרים m ו־n מקבילים',
    stemGivens: ['הזווית המסומנת היא 137°'],
    marks: ['given', 'g′', 'γ'],
    steps: [['given', 'g′', 'adjacent'], ['g′', 'γ', 'alternate']],
    derive: () => {
      const given = 137;
      const g2 = 180 - given; // adjacent angles on a line: 180 − 137 = 43
      const gamma = g2; // alternate, m ∥ n
      return { answer: { 'γ': gamma }, measures: { given, 'g′': g2, 'γ': gamma } };
    },
  },
  {
    id: 'U2-P2-C',
    parallelText: 'הישרים c ו־d מקבילים',
    stemGivens: ['∠F = 72°'],
    marks: ['F', 'F′', 'δ'],
    steps: [['F', 'F′', 'alternate'], ['F′', 'δ', 'adjacent']],
    derive: () => {
      const F = 72;
      const F2 = F; // alternate, c ∥ d
      const delta = 180 - F2; // adjacent: 180 − 72 = 108
      return { answer: { 'δ': delta }, measures: { F, 'F′': F2, 'δ': delta } };
    },
  },
  {
    id: 'U2-P2-D',
    parallelText: 'p ∥ q',
    stemGivens: ['∠A = 54°'],
    marks: ['A', 'A↓', 'A×', 'α'],
    // Route 1: corresponding then vertical.  Route 2: vertical then corresponding.
    steps: [['A', 'A↓', 'corresponding'], ['A↓', 'α', 'vertical'], ['A', 'A×', 'vertical'], ['A×', 'α', 'corresponding']],
    derive: () => {
      const A = 54;
      const route1 = A; // A → (corresponding) → (vertical) → α
      const route2 = A; // A → (vertical) → (corresponding) → α
      expect(route1).toBe(route2);
      return { answer: { 'α': route1 }, measures: { A, 'A↓': A, 'A×': A, 'α': route1 } };
    },
  },
  {
    id: 'U2-P3-A',
    parallelText: 'p ∥ q',
    stemGivens: ['זווית שגודלה 38°'],
    marks: ['ref', 'א', 'ב', 'ג', 'ד', 'ref*'],
    steps: [
      ['ref', 'א', 'corresponding'],
      ['ref', 'ב', 'alternate'],
      ['ref', 'ג', 'vertical'],
      ['ref', 'ד', 'adjacent'],
      ['ref', 'ref*', 'same'],
    ],
    derive: () => {
      const ref = 38;
      const corresponding = ref;
      const alternate = ref;
      const vertical = ref;
      const adjacent = 180 - ref; // 142
      return {
        answer: { 'מתאימה': corresponding, 'מתחלפת': alternate, 'קודקודית': vertical, 'צמודה': adjacent },
        measures: { ref, 'א': corresponding, 'ב': alternate, 'ג': vertical, 'ד': adjacent, 'ref*': ref },
      };
    },
  },
  {
    id: 'U2-P3-B',
    parallelText: null,
    stemGivens: ['∠A = 52°'],
    marks: ['A', 'D', 'F'],
    steps: [['A', 'D', 'corresponding'], ['D', 'F', 'adjacent']],
    derive: () => {
      const A = 52;
      const D = A; // corresponding (k ∥ m, marked in the drawing)
      const F = 180 - D; // adjacent: 128
      return { answer: { '∠D': D, '∠F': F }, measures: { A, D, F } };
    },
  },
  {
    id: 'U2-P3-C',
    parallelText: 'p ∥ q',
    stemGivens: ['∠A = 62°', '∠C = 77°'],
    marks: ['A', 'β', 'C'],
    steps: [['A', 'β', 'corresponding']],
    unrelated: [['C', 'A'], ['C', 'β']],
    unneeded: 'C',
    derive: () => {
      const A = 62;
      const C = 77;
      const beta = A; // corresponding on transversal t; ∠C sits on the other transversal
      return { answer: { 'β': beta }, measures: { A, 'β': beta, C } };
    },
  },
  {
    id: 'U2-P3-D',
    parallelText: 'הישרים a ו־b מקבילים',
    stemGivens: ['∠A = 49°', '∠C = 73°'],
    marks: ['A', 'α', 'C', 'β'],
    steps: [['A', 'α', 'corresponding'], ['C', 'β', 'alternate']],
    derive: () => {
      const A = 49;
      const C = 73;
      const alpha = A; // corresponding, a ∥ b
      const beta = C; // alternate, a ∥ b
      return { answer: { 'α': alpha, 'β': beta }, measures: { A, 'α': alpha, C, 'β': beta } };
    },
  },
  {
    id: 'U2-P4-A',
    parallelText: 'p ∥ q',
    stemGivens: ['(4x + 6)°', '(2x + 38)°'],
    marks: ['e1', 'e2'],
    steps: [['e1', 'e2', 'corresponding']],
    equations: [{ left: '4x + 6', right: '2x + 38', kind: 'equal' }],
    derive: () => {
      // 4x + 6 = 2x + 38  ⇒  2x = 32  ⇒  x = 16
      const x = (38 - 6) / (4 - 2);
      return { answer: { x }, measures: { e1: 4 * x + 6, e2: 2 * x + 38 } };
    },
  },
  {
    id: 'U2-P4-B',
    parallelText: 'הישרים k ו־m מקבילים',
    stemGivens: ['(3x + 17)°', '(5x − 21)°'],
    marks: ['e1', 'e2'],
    steps: [['e1', 'e2', 'alternate']],
    equations: [{ left: '3x + 17', right: '5x − 21', kind: 'equal' }],
    derive: () => {
      // 3x + 17 = 5x − 21  ⇒  38 = 2x  ⇒  x = 19
      const x = (17 + 21) / (5 - 3);
      return { answer: { x }, measures: { e1: 3 * x + 17, e2: 5 * x - 21 } };
    },
  },
  {
    id: 'U2-P4-C',
    parallelText: 'a ∥ b',
    stemGivens: ['(6x − 9)°', '(3x + 42)°'],
    marks: ['e1', 'e2'],
    steps: [['e1', 'e2', 'corresponding']],
    equations: [{ left: '6x − 9', right: '3x + 42', kind: 'equal' }],
    derive: () => {
      // 6x − 9 = 3x + 42  ⇒  3x = 51  ⇒  x = 17 ; angle = 6·17 − 9 = 93
      const x = (42 + 9) / (6 - 3);
      const angle = 6 * x - 9;
      return { answer: { x, 'זווית': angle }, measures: { e1: angle, e2: 3 * x + 42 } };
    },
  },
  {
    id: 'U2-P4-D',
    parallelText: 'הישרים r ו־s מקבילים',
    stemGivens: ['(2x + 35)°', '(5x − 19)°'],
    marks: ['e1', 'e2'],
    steps: [['e1', 'e2', 'alternate']],
    equations: [{ left: '2x + 35', right: '5x − 19', kind: 'equal' }],
    derive: () => {
      // alternate angles are equal: 2x + 35 = 5x − 19  ⇒  54 = 3x  ⇒  x = 18
      const x = (35 + 19) / (5 - 2);
      return { answer: { x }, measures: { e1: 2 * x + 35, e2: 5 * x - 19 }, choice: '2x + 35 = 5x − 19' };
    },
  },
  {
    id: 'U2-P5-A',
    parallelText: 'p ∥ q',
    stemGivens: ['(7x − 18)°', '(3x + 46)°'],
    marks: ['e1', 'e2'],
    steps: [['e1', 'e2', 'corresponding']],
    equations: [{ left: '7x − 18', right: '3x + 46', kind: 'equal' }],
    derive: () => {
      // 7x − 18 = 3x + 46  ⇒  4x = 64  ⇒  x = 16 ; angle = 7·16 − 18 = 94
      const x = (46 + 18) / (7 - 3);
      const angle = 7 * x - 18;
      return { answer: { x, 'זווית': angle }, measures: { e1: angle, e2: 3 * x + 46 } };
    },
  },
  {
    id: 'U2-P5-B',
    parallelText: 'הישרים c ו־d מקבילים',
    stemGivens: ['(4x + 15)°', '(2x + 63)°'],
    marks: ['e1', 'e2'],
    steps: [['e1', 'e2', 'alternate']],
    equations: [{ left: '4x + 15', right: '2x + 63', kind: 'equal' }],
    derive: () => {
      // 4x + 15 = 2x + 63  ⇒  2x = 48  ⇒  x = 24 ; angle = 4·24 + 15 = 111
      const x = (63 - 15) / (4 - 2);
      const angle = 4 * x + 15;
      return { answer: { x, 'זווית': angle }, measures: { e1: angle, e2: 2 * x + 63 } };
    },
  },
  {
    id: 'U2-P5-C',
    parallelText: 'p ∥ q',
    stemGivens: ['(3x + 12)°', '72°', '(2y + 18)°', '94°'],
    marks: ['ex', 'n72', 'ey', 'n94'],
    steps: [['ex', 'n72', 'corresponding'], ['ey', 'n94', 'alternate']],
    equations: [
      { left: '3x + 12', right: '72', kind: 'equal' },
      { left: '2y + 18', right: '94', kind: 'equal' },
    ],
    derive: () => {
      // 3x + 12 = 72  ⇒  x = 20 ;  2y + 18 = 94  ⇒  y = 38
      const x = (72 - 12) / 3;
      const y = (94 - 18) / 2;
      return { answer: { x, y }, measures: { ex: 3 * x + 12, n72: 72, ey: 2 * y + 18, n94: 94 } };
    },
  },
  {
    id: 'U2-P5-D',
    parallelText: null,
    stemGivens: ['2x + 20 = 3x + 35', 'צמודות'],
    marks: ['e1', 'e2'],
    steps: [['e1', 'e2', 'adjacent']],
    equations: [{ left: '2x + 20', right: '3x + 35', kind: 'supplementary' }],
    derive: () => {
      // adjacent angles: (2x + 20) + (3x + 35) = 180  ⇒  5x = 125  ⇒  x = 25
      const x = (180 - 20 - 35) / (2 + 3);
      return { answer: { x }, measures: { e1: 2 * x + 20, e2: 3 * x + 35 } };
    },
  },
  {
    id: 'U2-P6-A',
    parallelText: 'שני מדפים מקבילים',
    stemGivens: ['64°'],
    marks: ['given', 'target'],
    steps: [['given', 'target', 'corresponding']],
    derive: () => {
      const given = 64;
      const target = given; // corresponding, shelves are parallel
      return { answer: { 'זווית': target }, measures: { given, target } };
    },
  },
  {
    id: 'U2-P6-B',
    parallelText: 'שתי מסילות ישרות מקבילות',
    stemGivens: ['118°'],
    marks: ['given', 'target'],
    steps: [['given', 'target', 'alternate']],
    derive: () => {
      const given = 118;
      const target = given; // alternate, rails are parallel
      return { answer: { 'זווית': target }, measures: { given, target } };
    },
  },
  {
    id: 'U2-P6-C',
    parallelText: 'p ∥ q',
    stemGivens: ['∠A = 128°', '∠C = 75°'],
    marks: ['A', 'A′', 'α', 'C'],
    steps: [['A', 'A′', 'corresponding'], ['A′', 'α', 'adjacent']],
    unrelated: [['C', 'A'], ['C', 'α']],
    unneeded: 'C',
    derive: () => {
      const A = 128;
      const C = 75;
      const A2 = A; // corresponding, p ∥ q
      const alpha = 180 - A2; // adjacent: 52
      return { answer: { 'α': alpha }, measures: { A, 'A′': A2, 'α': alpha, C } };
    },
  },
  {
    id: 'U2-P6-D',
    parallelText: 'הישרים k ו־m מקבילים',
    stemGivens: ['∠A = 41°', '∠C = 68°'],
    marks: ['A', 'α', 'C', 'C′', 'β'],
    steps: [['A', 'α', 'corresponding'], ['C', 'C′', 'corresponding'], ['C′', 'β', 'adjacent']],
    derive: () => {
      const A = 41;
      const C = 68;
      const alpha = A; // corresponding, k ∥ m
      const C2 = C; // corresponding, k ∥ m
      const beta = 180 - C2; // adjacent: 112
      return {
        answer: { 'α': alpha, 'β': beta, 'α + β': alpha + beta },
        measures: { A, 'α': alpha, C, 'C′': C2, 'β': beta },
      };
    },
  },
];

/** Tasks whose drawing is misleading about acute / obtuse (see header). */
const ACUTE_OBTUSE_ISSUES: Record<string, string> = {
  'U2-P2-D': 'CI-1',
  'U2-P4-C': 'CI-2',
  'U2-P4-D': 'CI-3',
  'U2-P5-C': 'CI-4',
  'U2-P5-D': 'CI-5',
  'U2-P6-B': 'CI-6',
  'U2-P6-C': 'CI-7',
  'U2-P6-D': 'CI-8',
  'U3-P3-C': 'CI-9',
  'U4-P2-A': 'CI-10',
};

function namedAngles(spec: { id: string; marks: string[] }) {
  const drawing = drawingOf(spec.id);
  expect(drawing.angles.map(a => a.label), `${spec.id}: rendered marks`).toHaveLength(spec.marks.length);
  return new Map(spec.marks.map((name, index) => [name, drawing.angles[index]!]));
}

function assertMarksMatchStem(spec: Unit2Spec, q: Unit2Question | Unit4Question, measures: Record<string, number>, solution: { x?: number; y?: number }) {
  const drawing = drawingOf(spec.id);
  spec.marks.forEach((name, index) => {
    const mark = drawing.marks[index]!;
    const measure = measures[name]!;
    const value = mark.value;
    if (value && isDegreeValue(value)) {
      expect(Number.parseInt(value, 10), `${spec.id} ${name}: drawn value vs hand measure`).toBe(measure);
      const statement = mark.label && /^[A-Z]$/.test(mark.label) ? `∠${mark.label} = ${value}` : value;
      expect(q.stem, `${spec.id} ${name}: drawn datum "${statement}" must be a given of the stem`).toContain(statement);
    }
    if (value && isExpressionValue(value)) {
      expect(q.stem, `${spec.id} ${name}: drawn expression must appear in the stem`).toContain(bareExpression(value));
      expect(evaluate(parseLinear(bareExpression(value)), solution), `${spec.id} ${name}: drawn expression at the solution`).toBe(measure);
    }
    if (mark.label && /^[α-ω]$/.test(mark.label)) {
      expect(q.stem, `${spec.id}: unknown ${mark.label} drawn but not asked for`).toContain(mark.label);
    }
  });
  // Conversely, every degree value stated in the stem is a datum drawn on the figure.
  for (const [, digits] of q.stem.matchAll(/(\d+)°/g)) {
    const shown = spec.marks.some((name, index) => drawing.marks[index]!.value === `${digits}°` && measures[name] === Number(digits));
    expect(shown, `${spec.id}: stem datum ${digits}° is not drawn`).toBe(true);
  }
}

describe('independent verification — the verifier itself', () => {
  it('classifies a hand-checkable figure correctly (horizontal parallels, transversal at 60°)', async () => {
    // Horizontal lines, transversal running down-right at 60° (SVG y points down). By hand:
    // sector 0 = 0°→60° (right of t, below the upper line), 1 = 60°→180°, 2 = 180°→240°, 3 = 240°→360°.
    const { ParallelLinesDiagram } = await import('../../src/geometry/ParallelLinesDiagram');
    const marks: AngleMark[] = ([0, 1, 2, 3] as const).flatMap(sector => [
      { intersection: 'top' as const, sector, label: `T${sector}` },
      { intersection: 'bottom' as const, sector, label: `B${sector}` },
    ]);
    const props: ParallelLinesDiagramProps = { orientationDeg: 0, transversalDeg: 60, angleMarks: marks };
    const svg = renderToStaticMarkup(createElement(ParallelLinesDiagram, props));
    const figure = readParallelDrawing(svg.slice(svg.indexOf('<svg')), props);
    const at = new Map(figure.angles.map(angle => [angle.label, angle]));
    const rel = (a: string, b: string) => relationOf(at.get(a)!, at.get(b)!);

    expect(figure.angles.map(a => Math.round(a.span))).toEqual([60, 60, 120, 120, 60, 60, 120, 120]);
    expect(['T0', 'T1', 'B2', 'B3'].map(l => at.get(l)!.interior)).toEqual([true, true, true, true]);
    expect(['T2', 'T3', 'B0', 'B1'].map(l => at.get(l)!.interior)).toEqual([false, false, false, false]);
    for (const s of [0, 1, 2, 3]) expect(rel(`T${s}`, `B${s}`)).toBe('corresponding');
    expect(rel('T0', 'B2')).toBe('alternate');
    expect(rel('T1', 'B3')).toBe('alternate');
    expect(rel('T2', 'B0')).toBe('alternate-exterior');
    expect(rel('T0', 'B3')).toBe('same-side');
    expect(rel('T0', 'T2')).toBe('vertical');
    expect(rel('T0', 'T1')).toBe('adjacent');
    expect(rel('T0', 'T3')).toBe('adjacent');
    expect(rel('T0', 'T0')).toBe('same');
  });

  it('parses and solves linear angle expressions', () => {
    expect(parseLinear('180 − (5x − 19)')).toEqual({ x: -5, y: 0, c: 199 });
    expect(parseLinear('(2y + 18)°')).toEqual({ x: 0, y: 2, c: 18 });
    expect(solveOne(parseEquation('4x + 6 = 2x + 38'))).toEqual({ variable: 'x', value: 16 });
    expect(solveOne(parseEquation('2x + 1 = 2x + 5'))).toBeNull();
    expect(equivalent(parseEquation('2x + 35 = 180 − (5x − 19)'), parseEquation('(2x + 35) + (5x − 19) = 180'))).toBe(true);
    expect(equivalent(parseEquation('2x + 35 = 5x − 19'), parseEquation('2x + 35 = 5x + 19'))).toBe(false);
  });
});

describe('independent verification — rendered drawings faithfully show the diagram data', () => {
  for (const [id, drawing] of drawings) {
    it(`${id}: lines, vertices, arcs and labels in the SVG match the props`, () => {
      const props = drawing.props;
      const o = props.orientationDeg ?? 0;
      for (const d of drawing.parallelDirs) expect(lineAngleGap(d, o), `${id}: parallel line direction`).toBeLessThan(1e-6);
      if (drawing.kind === 'parallel') {
        const p = props as ParallelLinesDiagramProps;
        expect(lineAngleGap(drawing.transversalDirs[0]!, p.transversalDeg ?? 62)).toBeLessThan(1e-6);
        if (p.secondaryTransversalDeg != null) {
          expect(lineAngleGap(drawing.transversalDirs[1]!, p.secondaryTransversalDeg)).toBeLessThan(1e-6);
        }
        expect(drawing.angles.map(a => a.vertex), `${id}: vertex of every mark`).toEqual(drawing.marks.map(m => m.intersection));
        expect(drawing.angles.map(a => a.label), `${id}: text drawn at every mark`).toEqual(drawing.marks.map(m => m.label ?? m.value ?? null));
        for (const angle of drawing.angles) expect(angle.arcInside, `${id}: arc leaves its sector`).toBe(true);
        expect(drawing.chevrons, `${id}: parallel marks`).toEqual(p.showParallelMarks === false ? [] : [0, 1]);
      } else {
        const p = props as ThreeLinesDiagramProps;
        expect(lineAngleGap(drawing.transversalDirs[0]!, p.transversalDeg ?? 61)).toBeLessThan(1e-6);
        expect(drawing.angles.map(a => a.label)).toEqual((p.angleMarks ?? []).map(m => m.label ?? m.value ?? ''));
        // A callout must point unambiguously into one sector.
        for (const angle of drawing.angles) expect(angle.margin, `${id}: callout too close to a line`).toBeGreaterThan(3);
      }
      for (const angle of drawing.angles) {
        expect(angle.span).toBeGreaterThan(0);
        expect(angle.span).toBeLessThan(180);
      }
    });
  }
});

describe('independent verification — unit 2 hand-derived solutions', () => {
  it('covers every unit-2 task exactly once', () => {
    expect(unit2Specs.map(spec => spec.id)).toEqual(unit2Questions.map(q => q.id));
  });

  for (const spec of unit2Specs) {
    const q = byId(unit2Questions, spec.id);
    const { answer, measures, choice } = spec.derive();
    const solution: { x?: number; y?: number } = {};
    if (answer.x != null) solution.x = answer.x;
    if (answer.y != null) solution.y = answer.y;

    describe(spec.id, () => {
      it('hand-derived answer equals the answer-key value; every angle lies strictly between 0° and 180°', () => {
        for (const given of spec.stemGivens) expect(q.stem, `${spec.id}: stem given "${given}"`).toContain(given);
        expect(q.expected.values ?? {}).toEqual(answer);
        if (choice !== undefined) {
          expect(q.expected.choice).toBe(choice);
          expect(q.choices ?? []).toContain(choice);
        }
        for (const [name, measure] of Object.entries(measures)) {
          expect(measure, `${spec.id} ${name}`).toBeGreaterThan(0);
          expect(measure, `${spec.id} ${name}`).toBeLessThan(180);
        }
        for (const [key, value] of Object.entries(answer)) {
          if (key === 'x' || key === 'y' || key.includes('+')) continue;
          expect(value, `${spec.id} ${key}`).toBeGreaterThan(0);
          expect(value, `${spec.id} ${key}`).toBeLessThan(180);
        }
      });

      it('every number / expression drawn on the figure is the matching given of the stem', () => {
        assertMarksMatchStem(spec, q, measures, solution);
      });

      it('every step of the solution is a real angle relation in the rendered drawing', () => {
        const angles = namedAngles(spec);
        for (const [from, to, relation] of spec.steps) {
          expect(relationOf(angles.get(from)!, angles.get(to)!), `${spec.id}: ${from} → ${to}`).toBe(relation);
          if (relation !== 'adjacent') expect(measures[from], `${spec.id}: ${from} = ${to}`).toBe(measures[to]);
          else expect(measures[from]! + measures[to]!, `${spec.id}: ${from} + ${to}`).toBe(180);
        }
        for (const [a, b] of spec.unrelated ?? []) {
          expect(relationOf(angles.get(a)!, angles.get(b)!), `${spec.id}: ${a} vs ${b}`).toBe('unrelated');
        }
        if (spec.unneeded) {
          const mark = drawingOf(spec.id).marks[spec.marks.indexOf(spec.unneeded)]!;
          expect(spec.steps.flat()).not.toContain(spec.unneeded);
          expect(q.expected.unneededDatum).toBe(`∠${mark.label} = ${measures[spec.unneeded]}°`);
        } else {
          expect(q.expected.unneededDatum).toBeUndefined();
        }
      });

      it('the cited theorems are exactly the relations the derivation uses', () => {
        const texts = asList(q.expected.justification);
        for (const text of texts) {
          for (const forbidden of THEOREM_GUARDRAILS.forbiddenStandaloneClaims) expect(text).not.toContain(forbidden);
        }
        if (spec.id === 'U2-P2-D') {
          // Two routes, each named as an ordered pair of relations.
          const routes = texts.map(text => {
            const order = [
              { kind: 'corresponding', at: text.indexOf('מתאימות') },
              { kind: 'vertical', at: text.indexOf('קודקודיות') },
            ].filter(item => item.at >= 0).sort((a, b) => a.at - b.at);
            return order.map(item => item.kind);
          });
          expect(routes).toEqual([['corresponding', 'vertical'], ['vertical', 'corresponding']]);
          return;
        }
        if (texts.length === 0) return;
        const used = distinct(spec.steps.map(step => step[2]).filter(kind => kind !== 'same'));
        expect(texts.map(theoremKind), `${spec.id}: justification`).toEqual(used);
        for (const text of texts) {
          const kind = theoremKind(text);
          if (kind === 'corresponding') expect(text.startsWith(CORRESPONDING_DIRECT)).toBe(true);
          if (kind === 'alternate') expect(text.startsWith(ALTERNATE_DIRECT)).toBe(true);
        }
      });

      it('a direct theorem is applied only when the parallel condition is given', () => {
        const usesDirect = spec.steps.some(([, , relation]) => relation === 'corresponding' || relation === 'alternate');
        const drawing = drawingOf(spec.id);
        if (!usesDirect) {
          expect(spec.parallelText).toBeNull();
          return;
        }
        expect(q.diagram.parallelGiven).toBe(true);
        expect(drawing.chevrons, `${spec.id}: both parallel lines carry parallel marks`).toEqual([0, 1]);
        if (spec.parallelText !== null) {
          expect(q.stem).toContain(spec.parallelText);
          const [first, second] = q.diagram.lineLabels;
          if (first && second && first.length === 1) {
            expect(spec.parallelText).toContain(first);
            expect(spec.parallelText).toContain(second);
          }
        }
      });

      const issue = ACUTE_OBTUSE_ISSUES[spec.id];
      // CI-1 … CI-8: see header — the drawn sector contradicts the acute/obtuse measure.
      (issue ? it.fails : it)(`drawn angles agree with the computed measures on acute / obtuse (SPEC 10.3)${issue ? ` — ${issue}` : ''}`, () => {
        const angles = namedAngles(spec);
        const violations = acuteObtuseViolations(
          spec.marks.map(name => ({ name, drawn: angles.get(name)!.span, measure: measures[name]! })),
        );
        expect(violations).toEqual([]);
      });
    });
  }
});

describe('independent verification — unit 2 algebra: unique, valid, justified', () => {
  const algebraic = unit2Specs.filter(spec => spec.equations);

  it('every unit-2 task whose stem contains x or y is covered by a hand-built equation', () => {
    const withUnknown = unit2Questions.filter(q => /(?:^|[^A-Za-z])[xy](?:[^A-Za-z]|$)/.test(q.stem)).map(q => q.id);
    expect(algebraic.map(spec => spec.id)).toEqual(withUnknown);
  });

  for (const spec of algebraic) {
    const q = byId(unit2Questions, spec.id);
    const { answer } = spec.derive();

    it(`${spec.id}: each equation has exactly one solution, it matches the hand derivation, and yields valid angles`, () => {
      for (const { left, right, kind } of spec.equations!) {
        const equation = kind === 'equal' ? parseEquation(`${left} = ${right}`) : parseEquation(`(${left}) + (${right}) = 180`);
        const solved = solveOne(equation);
        expect(solved, `${spec.id}: ${left} / ${right} must determine one unknown uniquely`).not.toBeNull();
        const { variable, value } = solved!;
        expect(Number.isInteger(value), `${spec.id}: ${variable} should be a whole number`).toBe(true);
        expect(value).toBe(answer[variable]);
        const point = { [variable]: value };
        const l = evaluate(parseLinear(left), point);
        const r = evaluate(parseLinear(right), point);
        for (const angle of [l, r]) {
          expect(angle).toBeGreaterThan(0);
          expect(angle).toBeLessThan(180);
        }
        if (kind === 'equal') expect(l).toBe(r);
        else expect(l + r).toBe(180);
      }
    });

    if (q.justificationLane !== true) continue;
    it(`${spec.id}: has a justification lane and a justification that names the relation behind the equation`, () => {
      expect(q.justificationLane).toBe(true);
      expect(asList(q.expected.justification).length).toBeGreaterThan(0);
    });
  }

  it('U2-P4-D: exactly one offered equation expresses "alternate angles are equal", and it is the key', () => {
    const q = byId(unit2Questions, 'U2-P4-D');
    const target = parseEquation('2x + 35 = 5x − 19');
    const matching = (q.choices ?? []).filter(choice => equivalent(parseEquation(choice), target));
    expect(matching).toEqual([q.expected.choice]);
    // Every distractor leads to a non-integer or different x.
    for (const choice of q.choices ?? []) {
      if (choice === q.expected.choice) continue;
      const solved = solveOne(parseEquation(choice));
      expect(solved === null || solved.value !== 18).toBe(true);
    }
  });

  it('U2-P5-D: the student equation is wrong (it gives a negative angle); the key equation is the adjacent-angle equation', () => {
    const q = byId(unit2Questions, 'U2-P5-D');
    const student = /המשוואה ([^.]+)\./.exec(q.stem)?.[1];
    expect(student).toBe('2x + 20 = 3x + 35');
    const studentSolution = solveOne(parseEquation(student!));
    expect(studentSolution).toEqual({ variable: 'x', value: -15 });
    expect(evaluate(parseLinear('2x + 20'), { x: -15 })).toBeLessThanOrEqual(0);
    const supplementary = parseEquation('(2x + 20) + (3x + 35) = 180');
    expect(equivalent(parseEquation(student!), supplementary)).toBe(false);
    const keyEquation = /(\(2x \+ 20\) \+ \(3x \+ 35\) = 180)/.exec(asList(q.expected.justification).join(' '))?.[1];
    expect(keyEquation).toBeDefined();
    expect(equivalent(parseEquation(keyEquation!), supplementary)).toBe(true);
  });

  it('U2-P1-C: exactly one offered size equals the corresponding angle', () => {
    const q = byId(unit2Questions, 'U2-P1-C');
    expect((q.choices ?? []).filter(choice => choice === '47°')).toEqual([q.expected.choice]);
    expect(new Set(q.choices).size).toBe(q.choices?.length);
  });

  it('U2-P3-A: table rows, drawn letters א–ד and answer keys describe the same four relations in the same order', () => {
    const q = byId(unit2Questions, 'U2-P3-A');
    expect((q.tableRows ?? []).map(row => row.relation)).toEqual(['מתאימות', 'מתחלפות', 'קודקודיות', 'צמודות']);
    expect(Object.keys(q.expected.values ?? {})).toEqual(['מתאימה', 'מתחלפת', 'קודקודית', 'צמודה']);
    const drawing = drawingOf('U2-P3-A');
    expect(drawing.angles.slice(1, 5).map(a => a.label)).toEqual(['א', 'ב', 'ג', 'ד']);
    const ref = drawing.angles[0]!;
    expect(drawing.angles.slice(1, 5).map(a => relationOf(ref, a))).toEqual(['corresponding', 'alternate', 'vertical', 'adjacent']);
  });

  it('U2-P3-B: the table states the same relations the drawing shows', () => {
    const q = byId(unit2Questions, 'U2-P3-B');
    expect(q.tableRows).toEqual([
      { label: '∠A', relation: 'נתונה', value: '52°' },
      { label: '∠D', relation: 'מתאימה ל־∠A', value: '' },
      { label: '∠F', relation: 'צמודה ל־∠D', value: '' },
    ]);
  });

  it('U2-P3-B is the only direct-theorem computation whose parallel condition is given solely by the parallel marks of the drawing', () => {
    const drawingOnly = unit2Specs
      .filter(spec => spec.parallelText === null && spec.steps.some(([, , r]) => r === 'corresponding' || r === 'alternate'))
      .map(spec => spec.id);
    expect(drawingOnly).toEqual(['U2-P3-B']);
    expect(byId(unit2Questions, 'U2-P3-B').stem).not.toMatch(/∥|מקביל/);
  });
});

// ---------------------------------------------------------------------------
// Unit 4 — converse theorems.
// ---------------------------------------------------------------------------

const CONVERSE = {
  corresponding: THEOREMS.correspondingConverse.text,
  alternate: THEOREMS.alternateConverse.text,
} as const;

type Unit4Spec = Unit2Spec & { converse: 'corresponding' | 'alternate'; conclusion: string };

const unit4Specs: Unit4Spec[] = [
  {
    id: 'U4-P1-D',
    parallelText: null,
    stemGivens: ['∠A = 67°', '∠B = 67°', 'מתאימות'],
    marks: ['A', 'B'],
    steps: [['A', 'B', 'corresponding']],
    converse: 'corresponding',
    conclusion: 'p ∥ q',
    derive: () => {
      const A = 67;
      const B = 67;
      expect(A).toBe(B); // the corresponding pair is equal ⇒ converse theorem applies
      return { answer: {}, measures: { A, B } };
    },
  },
  {
    id: 'U4-P2-A',
    parallelText: null,
    stemGivens: ['∠C = 112°', '∠D = 112°', 'מתחלפות'],
    marks: ['C', 'D'],
    steps: [['C', 'D', 'alternate']],
    converse: 'alternate',
    conclusion: 'k ∥ m',
    derive: () => {
      const C = 112;
      const D = 112;
      expect(C).toBe(D); // the alternate pair is equal ⇒ converse theorem applies
      return { answer: {}, measures: { C, D } };
    },
  },
  {
    id: 'U4-P2-C',
    parallelText: null,
    stemGivens: ['(3x + 14)°', '(5x − 26)°', 'מתאימות'],
    marks: ['e1', 'e2'],
    steps: [['e1', 'e2', 'corresponding']],
    equations: [{ left: '3x + 14', right: '5x − 26', kind: 'equal' }],
    converse: 'corresponding',
    conclusion: 'p ∥ q',
    derive: () => {
      // p ∥ q follows from the converse exactly when the corresponding angles are equal:
      // 3x + 14 = 5x − 26  ⇒  40 = 2x  ⇒  x = 20 ; angle = 3·20 + 14 = 74
      const x = (14 + 26) / (5 - 3);
      const angle = 3 * x + 14;
      return { answer: { x, 'זווית': angle }, measures: { e1: angle, e2: 5 * x - 26 } };
    },
  },
];

describe('independent verification — unit 4 converse tasks', () => {
  for (const spec of unit4Specs) {
    const q = byId(unit4Questions, spec.id);
    const { answer, measures } = spec.derive();
    const solution: { x?: number } = {};
    if (answer.x != null) solution.x = answer.x;

    describe(spec.id, () => {
      it('hand-derived answer equals the answer key; angles lie strictly between 0° and 180°', () => {
        for (const given of spec.stemGivens) expect(q.stem).toContain(given);
        expect(q.expected.values ?? {}).toEqual(answer);
        for (const measure of Object.values(measures)) {
          expect(measure).toBeGreaterThan(0);
          expect(measure).toBeLessThan(180);
        }
      });

      it('the drawn data are the stem givens, and the pair really stands in the stated relation', () => {
        assertMarksMatchStem(spec, q, measures, solution);
        const angles = namedAngles(spec);
        for (const [from, to, relation] of spec.steps) {
          expect(relationOf(angles.get(from)!, angles.get(to)!)).toBe(relation);
          expect(measures[from]).toBe(measures[to]);
        }
      });

      it('parallelism is the conclusion, never a given: no parallel marks, no parallel statement', () => {
        expect(q.diagram?.parallelGiven).toBe(false);
        expect(drawingOf(spec.id).chevrons).toEqual([]);
        const [first, second] = q.diagram?.lineLabels ?? [];
        expect(q.stem).not.toContain(`נתון ${first} ∥ ${second}`);
        expect(q.stem).not.toContain(`הישרים ${first} ו־${second} מקבילים`);
        expect(q.expected.conclusion).toBe(`${first} ∥ ${second}`);
        expect(spec.conclusion).toBe(q.expected.conclusion);
      });

      it('the cited reason is the converse theorem matching the drawn relation', () => {
        if (spec.equations) {
          const justification = asList(q.expected.justification).join(' ');
          const reasons = asList(q.expected.reason).join(' ');
          expect(spec.equations).toHaveLength(1);
          const { left, right } = spec.equations[0]!;
          expect(justification).toContain('המשפט ההפוך');
          expect(justification).toContain(`${left} = ${right}`);
          expect(justification).toContain(`x = ${answer.x}`);
          expect(reasons).toContain(`x = ${answer.x}`);
          expect(reasons).toContain(`${answer['זווית']}°`);
          expect(reasons).toContain(spec.converse === 'corresponding' ? 'הזוויות המתאימות' : 'הזוויות המתחלפות');
          const equation = /(\S+ \+ \d+ = \S+ − \d+)/.exec(justification)?.[1];
          expect(equation).toBeDefined();
          expect(equivalent(parseEquation(equation!), parseEquation(`${left} = ${right}`))).toBe(true);
        } else {
          const reason = asList(q.expected.reason).join(' ');
          // Same sentence as the canonical converse (SPEC 3.2); the key omits the comma after „שלישי”.
          expect(withoutCommas(reason)).toBe(withoutCommas(CONVERSE[spec.converse]));
        }
      });

      const issue = ACUTE_OBTUSE_ISSUES[spec.id];
      // CI-10: see header.
      (issue ? it.fails : it)(`drawn angles agree with the computed measures on acute / obtuse (SPEC 10.3)${issue ? ` — ${issue}` : ''}`, () => {
        const angles = namedAngles(spec);
        const violations = acuteObtuseViolations(
          spec.marks.map(name => ({ name, drawn: angles.get(name)!.span, measure: measures[name]! })),
        );
        expect(violations).toEqual([]);
      });
    });
  }

  it('U4-P2-C: every x other than 20 breaks the equality, so x = 20 is the only value that guarantees p ∥ q', () => {
    const equation = parseEquation('3x + 14 = 5x − 26');
    expect(solveOne(equation)).toEqual({ variable: 'x', value: 20 });
    for (const x of [19, 21, 0, 40]) expect(evaluate(equation, { x })).not.toBe(0);
  });

  it('U4-P2-B: exactly one offered condition is a converse-theorem condition, and it is the key', () => {
    const q = byId(unit4Questions, 'U4-P2-B');
    const sufficient = (q.choices ?? []).filter(choice => /(מתאימות|מתחלפות) בין p ו־q שוות/.test(choice));
    expect(sufficient).toEqual([q.expected.choice]);
    // The distractors are facts that hold for ANY two lines cut by a transversal.
    const alwaysTrue = (q.choices ?? []).filter(choice => choice !== q.expected.choice);
    expect(alwaysTrue).toHaveLength(3);
    expect(alwaysTrue.every(choice => /קודקודיות|צמודות שסכומן 180°|באותו קודקוד/.test(choice))).toBe(true);
    expect(drawingOf('U4-P2-B').chevrons).toEqual([]);
  });

  const threeLineAngles = () => {
    const drawing = drawingOf('U4-P2-D');
    expect(drawing.kind).toBe('three');
    const byLabel = new Map(drawing.angles.map(angle => [angle.label, angle]));
    const [A, B, C] = [byLabel.get('A')!, byLabel.get('B')!, byLabel.get('C')!];
    expect([A.vertex, B.vertex, C.vertex]).toEqual(['line-0', 'line-1', 'line-2']);
    return { A, B, C };
  };

  it('U4-P2-D: ∠A and ∠B are drawn as a corresponding pair between the given parallels p and q', () => {
    const { A, B } = threeLineAngles();
    expect(relationOf(A, B)).toBe('corresponding');
  });

  // CI-13: the ∠C badge is pushed across line r by label-collision avoidance, so its callout
  // points into the angle ABOVE r (same-side interior with ∠B), not the angle corresponding to ∠B.
  it.fails('U4-P2-D: ∠B and ∠C are drawn as a corresponding pair relative to q and r — CI-13', () => {
    const { B, C } = threeLineAngles();
    expect(relationOf(B, C)).toBe('corresponding');
  });

  it('U4-P2-D: direct theorem on the given p ∥ q, then the corresponding converse on q and r', () => {
    const q = byId(unit4Questions, 'U4-P2-D');
    const drawing = drawingOf('U4-P2-D');
    // Only the GIVEN pair p, q is marked parallel; q ∥ r is the conclusion.
    expect(drawing.chevrons).toEqual([0, 1]);
    expect(q.stem).toContain('נתון p ∥ q');
    const [givenPart, provePart] = q.stem.split('הוכיחו');
    expect(givenPart).not.toMatch(/q ∥ r|r ∥ q/);
    expect(provePart).toBe(' כי q ∥ r.');
    const proof = q.expected.proof ?? [];
    expect(proof[0]).toMatch(/^∠A = ∠B — זוויות מתאימות בין הישרים המקבילים p ו־q/);
    expect(proof[1]).toBe('∠A = ∠C — נתון.');
    expect(proof[2]).toMatch(/^לכן ∠B = ∠C/);
    expect(proof[3]).toContain('∠B ו־∠C הן זוויות מתאימות ביחס לישרים q ו־r');
    expect(proof[4]).toMatch(/^לכן q ∥ r — לפי המשפט ההפוך של זוויות מתאימות/);
    expect(q.expected.conclusion).toBe('q ∥ r');
  });
});

// ---------------------------------------------------------------------------
// Unit 3 — every relation a proof relies on must be the relation in the drawing.
// ---------------------------------------------------------------------------

type Claim = readonly [string, string, Kind];

/** Relations each unit-3 task relies on, read by hand from its stem / proof. */
const unit3Claims: Record<string, Claim[]> = {
  'U3-P1-A': [['A', 'B', 'corresponding']],
  'U3-P1-B': [['C', 'D', 'corresponding']],
  'U3-P1-C': [['A', 'B', 'corresponding'], ['C', 'D', 'alternate'], ['E', 'F', 'vertical']],
  'U3-P1-D': [['A', 'B', 'corresponding'], ['B', 'C', 'vertical']],
  'U3-P2-A': [['A', 'B', 'alternate']],
  'U3-P2-B': [['A', 'B', 'corresponding'], ['B', 'C', 'vertical']],
  'U3-P2-C': [['A', 'B', 'alternate'], ['B', 'C', 'vertical']],
  'U3-P2-D': [['A', 'B', 'corresponding']],
  'U3-P3-A': [['A', 'B', 'corresponding'], ['B', 'C', 'vertical']],
  'U3-P3-B': [['A', 'B', 'alternate'], ['B', 'C', 'adjacent']],
  'U3-P3-C': [['A', 'B', 'corresponding'], ['B', 'D', 'vertical']],
  'U3-P3-D': [['A', 'B', 'corresponding'], ['B', 'C', 'vertical']],
};

/** Relation claims written in the content's proofs / reasons (with blanks filled from the key). */
function writtenClaims(q: Unit3Question): Claim[] {
  const claims: Claim[] = [];
  const push = (claim: string, reason: string) => {
    const kind = theoremKind(reason);
    const eq = /∠([A-Z]) = ∠([A-Z])/.exec(claim) ?? /∠([A-Z]) \+ ∠([A-Z]) = 180°/.exec(claim);
    if (kind && eq) claims.push([eq[1]!, eq[2]!, kind]);
  };
  for (const line of q.expected.proof ?? []) {
    const [claim, reason] = line.split(' — ');
    if (claim && reason) push(claim, reason);
  }
  const keyReason = asList(q.expected.reason).join(' ');
  for (const row of q.proofLines ?? []) {
    const claim = row.claim.includes('___') ? keyReason : row.claim;
    const reason = row.reason?.includes('___') ? keyReason : row.reason ?? '';
    push(claim, reason);
  }
  const because = /^(∠[A-Z] = ∠[A-Z]) כי (.+)$/.exec(keyReason);
  if (because) push(because[1]!, because[2]!);
  return claims;
}

describe('independent verification — unit 3 proof relations match the drawing', () => {
  it('covers every unit-3 task', () => {
    expect(Object.keys(unit3Claims)).toEqual(unit3Questions.map(q => q.id));
  });

  for (const q of unit3Questions) {
    const claims = unit3Claims[q.id]!;

    it(`${q.id}: each relation the proof relies on is the relation drawn`, () => {
      const drawing = drawingOf(q.id);
      const byLabel = new Map(drawing.angles.map(angle => [angle.label, angle]));
      for (const [a, b, kind] of claims) {
        expect(byLabel.has(a) && byLabel.has(b), `${q.id}: ∠${a} and ∠${b} must be drawn`).toBe(true);
        expect(relationOf(byLabel.get(a)!, byLabel.get(b)!), `${q.id}: ∠${a} / ∠${b}`).toBe(kind);
      }
      // What the teacher key writes must be a subset of these hand-read claims.
      for (const claim of writtenClaims(q)) expect(claims).toContainEqual(claim);
    });

    it(`${q.id}: corresponding / alternate equality is only used with the parallel condition available`, () => {
      const drawing = drawingOf(q.id);
      const usesDirect = claims.some(([, , kind]) => kind === 'corresponding' || kind === 'alternate');
      if (!usesDirect) return;
      if (q.diagram.parallelGivens.length > 0) {
        expect(drawing.chevrons).toEqual([0, 1]);
        return;
      }
      // U3-P2-D: parallelism is exactly the missing datum the student must choose.
      const parallel = `${q.diagram.lineLabels[0]} ∥ ${q.diagram.lineLabels[1]}`;
      expect(drawing.chevrons).toEqual([]);
      expect(q.expected.choice).toBe(parallel);
      expect(asList(q.expected.reason).join(' ')).toContain(`לאחר הנתון ${parallel}`);
    });

    const duplicateIssue = q.id === 'U3-P1-C' ? 'CI-12' : undefined;
    // CI-12: see header — two different letters on one drawn angle.
    (duplicateIssue ? it.fails : it)(`${q.id}: different letters never name the same drawn angle${duplicateIssue ? ` — ${duplicateIssue}` : ''}`, () => {
      const labelled = drawingOf(q.id).angles.filter(angle => angle.label);
      const clashes: string[] = [];
      labelled.forEach((a, i) => labelled.slice(i + 1).forEach(b => {
        if (a.label !== b.label && relationOf(a, b) === 'same') clashes.push(`${a.label}≡${b.label}`);
      }));
      expect(clashes).toEqual([]);
    });
  }

  it('U3-P3-C: ∠E lies on the other transversal, so it is genuinely unrelated to ∠A, ∠B, ∠D', () => {
    const q = byId(unit3Questions, 'U3-P3-C');
    const byLabel = new Map(drawingOf('U3-P3-C').angles.map(angle => [angle.label, angle]));
    const E = byLabel.get('E')!;
    for (const other of ['A', 'B', 'D']) expect(relationOf(E, byLabel.get(other)!)).toBe('unrelated');
    expect(q.stem).toContain('∠E = 35°');
    expect(q.expected.proof).toContain('הנתון ∠E = 35° אינו נחוץ להוכחה.');
  });

  // CI-9: see header.
  it.fails('U3-P3-C: the drawn ∠E agrees with its given 35° on acute / obtuse (SPEC 10.3) — CI-9', () => {
    const drawing = drawingOf('U3-P3-C');
    const index = drawing.marks.findIndex(mark => mark.label === 'E');
    expect(drawing.marks[index]!.value).toBe('35°');
    expect(acuteObtuseViolations([{ name: 'E', drawn: drawing.angles[index]!.span, measure: 35 }])).toEqual([]);
  });

  it('unit 3: every other drawn numeric value agrees with its sector on acute / obtuse', () => {
    for (const q of unit3Questions) {
      if (q.id === 'U3-P3-C') continue;
      const drawing = drawingOf(q.id);
      drawing.marks.forEach((mark, index) => {
        if (!mark.value || !isDegreeValue(mark.value)) return;
        expect(acuteObtuseViolations([{ name: `${q.id} ${mark.label}`, drawn: drawing.angles[index]!.span, measure: Number.parseInt(mark.value, 10) }])).toEqual([]);
      });
    }
  });

  // CI-11: see header — corresponding + vertical always gives an alternate pair.
  it.fails('U3-P3-D: the key\'s claim that ∠A and ∠C are not alternate agrees with the drawing — CI-11', () => {
    const q = byId(unit3Questions, 'U3-P3-D');
    const claimsNotAlternate = (q.diagram.givens ?? []).some(given => /∠A and ∠C are not an alternate pair/.test(given))
      || asList(q.expected.reason).some(reason => reason.includes('∠A ו־∠C אינן זוג זוויות מתחלפות'));
    const byLabel = new Map(drawingOf('U3-P3-D').angles.map(angle => [angle.label, angle]));
    const relation = relationOf(byLabel.get('A')!, byLabel.get('C')!);
    if (claimsNotAlternate) expect(['alternate', 'alternate-exterior']).not.toContain(relation);
  });

  it('U3-P3-D: proof א is valid (corresponding with p ∥ q, then vertical) and is the key choice', () => {
    const q = byId(unit3Questions, 'U3-P3-D');
    expect(q.expected.choice).toBe('הוכחה א');
    const proofA = (q.subparts ?? [])[0] ?? '';
    expect(proofA).toContain('∠A = ∠B כי הן זוויות מתאימות בין הישרים המקבילים p ו־q');
    expect(proofA).toContain('∠B = ∠C כי הן זוויות קודקודיות');
    // Proof ב cites alternate angles WITHOUT the parallel condition — the SPEC 3.3 misconception.
    const proofB = (q.subparts ?? [])[1] ?? '';
    expect(proofB).toContain('מתחלפות');
    expect(proofB).not.toMatch(/מקביל|∥/);
  });
});
