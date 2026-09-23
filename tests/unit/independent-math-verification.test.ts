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
 * Content defects this suite found — ALL FIXED; each is now a permanent regression assertion
 * (the test names cite the id). Kept here as the record of what went wrong and why:
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
 *
 * Unit-1 identification keys (which angle / pair / location is the answer) are re-derived from
 * the rendered unit-1 drawings too: arcs, arc forms, letter and number label positions, parallel
 * marks and the drawn skew of every counterexample.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { REASONS, THEOREMS, THEOREM_GUARDRAILS } from '../../src/content/theorems';
import { unit2Questions, type Unit2Question } from '../../src/content/questions-unit2';
import { unit3Questions, type Unit3Question } from '../../src/content/questions-unit3';
import { unit4Questions, type Unit4Question } from '../../src/content/questions-unit4';
import type { AngleMark, ParallelLinesDiagramProps } from '../../src/geometry/ParallelLinesDiagram';
import type { ThreeLinesDiagramProps } from '../../src/geometry/ThreeLinesDiagram';
import { Unit2Pages } from '../../src/pages/Unit2Pages';
import { Unit3Pages } from '../../src/pages/Unit3Pages';
import { Unit4Pages } from '../../src/pages/Unit4Pages';
import { Unit1Page1 } from '../../src/App';
import { unit1Questions } from '../../src/content/questions-unit1';
import { teacherAnswerKey } from '../../src/content/answer-key';
import { Unit1Continuation } from '../../src/pages/Unit1Continuation';

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
/** The inner arc of each mark: "M start A r r 0 large 1 end" (sweep in the direction of increasing angle). */
const ARC_RE = new RegExp(`<path class="angle-arc angle-arc--inner" d="M ${NUM} ${NUM} A ${NUM} ${NUM} 0 ([01]) 1 ${NUM} ${NUM}"`, 'g');
const CHEVRON_RE = new RegExp(`<g class="parallel-mark parallel-mark--chevrons" transform="translate\\(${NUM} ${NUM}\\)`, 'g');
const LABEL_RE = /<text class="angle-label-text"[^>]*>([\s\S]*?)<\/text>/;

const decode = (text: string) =>
  text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&');

/**
 * Reads back the text a label DRAWS: the glyphs are math-italic code points (as in the question
 * text), subscripts are tspans, and binary operators carry medium math spaces.
 */
function drawnText(markup: string): string {
  return [...decode(markup.replace(/<[^>]+>/g, ''))].map(ch => {
    const cp = ch.codePointAt(0)!;
    if (cp === 0x210e) return 'h';
    if (cp >= 0x1d434 && cp < 0x1d44e) return String.fromCharCode(0x41 + cp - 0x1d434);
    if (cp >= 0x1d44e && cp < 0x1d468) return String.fromCharCode(0x61 + cp - 0x1d44e);
    if (cp >= 0x1d6fc && cp <= 0x1d714) return String.fromCharCode(0x3b1 + cp - 0x1d6fc);
    if (ch === '\u205f') return ' ';
    return ch;
  }).join('');
}

/** Centre of a circular arc from its end points, radius and flags (SVG, y down). */
function arcCentre(start: Pt, end: Pt, radius: number, large: boolean): Pt {
  const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const chord = minus(end, start);
  const half = Math.hypot(chord.x, chord.y) / 2;
  const toCentre = Math.sqrt(Math.max(0, radius * radius - half * half));
  // Sweep flag 1 turns with increasing angle; the small arc's centre lies to the chord's −90° side.
  const normal = { x: chord.y / (2 * half), y: -chord.x / (2 * half) };
  const sign = large ? -1 : 1;
  return { x: mid.x - sign * normal.x * toCentre, y: mid.y - sign * normal.y * toCentre };
}

type DrawnArc = { vertex: Pt; thetaStart: number; sweep: number };

function drawnArcs(svg: string): DrawnArc[] {
  return [...svg.matchAll(ARC_RE)].map(m => {
    const start = { x: Number(m[1]), y: Number(m[2]) };
    const radius = Number(m[3]);
    const end = { x: Number(m[6]), y: Number(m[7]) };
    const vertex = arcCentre(start, end, radius, m[5] === '1');
    const thetaStart = direction(vertex, start);
    return { vertex, thetaStart, sweep: norm(direction(vertex, end) - thetaStart) };
  });
}

/** The crossing dot an arc is centred on (every arc must be centred on a drawn crossing). */
function snapToDot(svg: string, point: Pt): Pt {
  const block = svg.slice(svg.indexOf('<g class="geometry-intersections"'));
  const dots = [...block.slice(0, block.indexOf('</g>')).matchAll(new RegExp(`<circle cx="${NUM}" cy="${NUM}"`, 'g'))]
    .map(m => ({ x: Number(m[1]), y: Number(m[2]) }));
  const nearest = dots.reduce((best, dot) => (Math.hypot(dot.x - point.x, dot.y - point.y) < Math.hypot(best.x - point.x, best.y - point.y) ? dot : best));
  if (Math.hypot(nearest.x - point.x, nearest.y - point.y) > 0.01) throw new Error('arc is not centred on a crossing');
  return nearest;
}

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
    return m ? drawnText(m[1]!) : null;
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
  const angles = drawnArcs(svg).map((drawn, index): DrawnAngle => {
    const vertex = snapToDot(svg, drawn.vertex);
    const thetaStart = drawn.thetaStart;
    const arc = drawn.sweep;
    const parallelLine = onLine(vertex, parallels);
    const transversal = onLine(vertex, transversals);
    if (parallelLine < 0 || transversal < 0) throw new Error(`mark ${index} is not drawn at a crossing`);
    const lineDeg = direction(parallels[parallelLine]!.a, parallels[parallelLine]!.b);
    const transDeg = direction(transversals[transversal]!.a, transversals[transversal]!.b);
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
  // Each mark is drawn as a real arc: its centre is the crossing, its middle points into the angle.
  const arcs = drawnArcs(svg);
  const angles = markChunks(svg).map((chunk, index): DrawnAngle => {
    const drawn = arcs[index];
    if (!drawn) throw new Error(`three-line mark ${index} has no arc`);
    const vertex = snapToDot(svg, drawn.vertex);
    const tip = { x: vertex.x + Math.cos(rad(drawn.thetaStart + drawn.sweep / 2)), y: vertex.y + Math.sin(rad(drawn.thetaStart + drawn.sweep / 2)) };
    const parallelLine = onLine(vertex, parallels);
    if (parallelLine < 0 || distanceToLine(vertex, transversal) > 0.05) throw new Error(`mark ${index} is not at a crossing`);
    const lineDeg = direction(parallels[parallelLine]!.a, parallels[parallelLine]!.b);
    const sector = locateSector(direction(vertex, tip), lineDeg, transDeg);
    const label = LABEL_RE.exec(chunk);
    const startOffset = norm(drawn.thetaStart - sector.from.deg);
    return {
      vertex: `line-${parallelLine}`,
      parallelLine,
      transversal: 0,
      lineSide: sector.lineRay.side,
      transSide: sector.transRay.side,
      interior: false,
      span: sector.width,
      label: label ? drawnText(label[1]!) : null,
      margin: sector.margin,
      arcInside: startOffset >= -1e-6 && startOffset + drawn.sweep <= sector.width + 1e-6,
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

/**
 * Short relation phrases, as keys and proof lines write them („זוויות מתאימות”, „מתחלפות”,
 * „קודקודיות”, „צמודות”, „זווית שטוחה”). A converse citation („המשפט ההפוך של זוויות מתאימות”, or
 * the canonical converse sentence) names its pair of angles with the same words.
 */
const RELATION_PHRASES: ReadonlyArray<readonly [RegExp, Kind]> = [
  [/מתאימות/g, 'corresponding'],
  [/מתחלפות/g, 'alternate'],
  [/קודקודיות/g, 'vertical'],
  [/צמודות|זווית שטוחה/g, 'adjacent'],
];

/** Every relation a text names, in reading order (repeats kept). */
function relationsNamed(text: string): Kind[] {
  return RELATION_PHRASES.flatMap(([phrase, kind]) => [...text.matchAll(phrase)].map(m => ({ kind, at: m.index })))
    .sort((a, b) => a.at - b.at)
    .map(hit => hit.kind);
}

const sentencesOf = (text: string) => text.split(/(?<=\.)\s+/).filter(sentence => sentence.trim() !== '');

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
    // Only ∠A and α are drawn: finding the two routes is the task, so their middle angles (A↓ on q,
    // A× vertical to ∠A) are not marked. Directly, ∠A and α are an alternate pair. Both routes
    // (corresponding then vertical, vertical then corresponding) are checked on a probe copy of the
    // figure that adds the two middle angles — see 'the cited theorems …' below.
    marks: ['A', 'α'],
    steps: [['A', 'α', 'alternate']],
    derive: () => {
      const A = 54;
      const Adown = A; // route 1: A → (corresponding, p ∥ q) → A↓
      const alpha = Adown; // route 1: A↓ → (vertical) → α
      const Across = A; // route 2: A → (vertical) → A×
      // Route 2 lands on the same α: A× → α is corresponding (checked on the probe figure).
      expect(Across).toBe(alpha);
      return { answer: { 'α': alpha }, measures: { A, 'α': alpha } };
    },
  },
  {
    id: 'U2-P3-A',
    parallelText: 'p ∥ q',
    stemGivens: ['זווית שגודלה 38°'],
    // The 38° angle is marked ONCE (it used to carry a second, differently coloured mark). The
    // letters deliberately do not follow the table's row order.
    marks: ['ref', 'א', 'ב', 'ג', 'ד'],
    steps: [
      ['ref', 'א', 'vertical'],
      ['ref', 'ב', 'corresponding'],
      ['ref', 'ג', 'adjacent'],
      ['ref', 'ד', 'alternate'],
    ],
    derive: () => {
      const ref = 38;
      const corresponding = ref;
      const alternate = ref;
      const vertical = ref;
      const adjacent = 180 - ref; // 142
      return {
        answer: { 'מתאימה': corresponding, 'מתחלפת': alternate, 'קודקודית': vertical, 'צמודה': adjacent },
        measures: { ref, 'א': vertical, 'ב': corresponding, 'ג': adjacent, 'ד': alternate },
      };
    },
  },
  {
    id: 'U2-P3-B',
    parallelText: 'הישרים k ו־m מקבילים',
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

/** Tasks whose drawing was once misleading about acute / obtuse — now fixed (see header). */
const ACUTE_OBTUSE_REGRESSIONS: Record<string, string> = {
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
const regressionNote = (id: string) => (ACUTE_OBTUSE_REGRESSIONS[id] ? ` (regression: ${ACUTE_OBTUSE_REGRESSIONS[id]})` : '');

/**
 * The only unit-2 tasks allowed to have no written justification in the key. Pinned, so a new task
 * that forgets its justification fails instead of silently skipping the citation check.
 */
const NO_WRITTEN_JUSTIFICATION: Record<string, string> = {
  'U2-P3-A': 'the four relations are the table rows themselves (מתאימות / מתחלפות / קודקודיות / צמודות), checked against the drawing',
  'U2-P3-B': 'the relations are the table\'s relation column (מתאימה ל־∠A, צמודה ל־∠D); the stem asks only for the two sizes',
  'U2-P3-C': 'the stem asks only for β and for the unneeded datum (no „נמקו”); the key states unneededDatum instead',
};

/** The drawn angle carrying the value of one side of an equation, e.g. '(4x + 6)°' or '72°'; exactly one mark must carry it. */
function markCarrying(id: string, side: string): DrawnAngle {
  const drawing = drawingOf(id);
  const indices = drawing.marks.flatMap((mark, index) => (mark.value === `(${side})°` || mark.value === `${side}°` ? [index] : []));
  expect(indices, `${id}: exactly one drawn mark carries "${side}"`).toHaveLength(1);
  return drawing.angles[indices[0]!]!;
}

function namedAngles(spec: { id: string; marks: string[] }) {
  const drawing = drawingOf(spec.id);
  expect(drawing.angles.map(a => a.label), `${spec.id}: rendered marks`).toHaveLength(spec.marks.length);
  return new Map(spec.marks.map((name, index) => [name, drawing.angles[index]!]));
}

/**
 * Checks what the student SEES next to each mark — the text rendered in the SVG, never the props — against the stem:
 * a drawn value is a given of the stem and equals the hand measure; a drawn expression is in the stem
 * and evaluates to the hand measure at the solution; a drawn name ∠X whose size the stem states
 * (∠X = v°) has hand measure v; a drawn Greek unknown is asked for in the stem. Conversely, every
 * degree value in the stem is on the figure: drawn as that value, or stated as ∠X = v° for an angle
 * drawn with the name X.
 */
function assertMarksMatchStem(spec: Unit2Spec, q: Unit2Question | Unit4Question, measures: Record<string, number>, solution: { x?: number; y?: number }) {
  const drawing = drawingOf(spec.id);
  const shown = spec.marks.map((name, index) => ({ name, text: drawing.angles[index]!.label, measure: measures[name]! }));
  for (const { name, text, measure } of shown) {
    if (!text) continue;
    if (isDegreeValue(text)) {
      expect(Number.parseInt(text, 10), `${spec.id} ${name}: drawn value vs hand measure`).toBe(measure);
      expect(q.stem, `${spec.id} ${name}: drawn datum "${text}" must be a given of the stem`).toContain(text);
    } else if (isExpressionValue(text)) {
      expect(q.stem, `${spec.id} ${name}: drawn expression must appear in the stem`).toContain(bareExpression(text));
      expect(evaluate(parseLinear(bareExpression(text)), solution), `${spec.id} ${name}: drawn expression at the solution`).toBe(measure);
    } else if (/^[A-Z]$/.test(text)) {
      const stated = new RegExp(`∠${text} = (\\d+)°`).exec(q.stem);
      if (stated) expect(Number(stated[1]), `${spec.id} ${name}: stem size of the drawn ∠${text} vs hand measure`).toBe(measure);
    } else if (/^[α-ω]$/.test(text)) {
      expect(q.stem, `${spec.id}: unknown ${text} drawn but not asked for`).toContain(text);
    }
  }
  for (const [, digits] of q.stem.matchAll(/(\d+)°/g)) {
    const asValue = shown.some(angle => angle.text === `${digits}°` && angle.measure === Number(digits));
    const asName = [...q.stem.matchAll(new RegExp(`∠([A-Z]) = ${digits}°`, 'g'))]
      .some(([, letter]) => shown.some(angle => angle.text === letter && angle.measure === Number(digits)));
    expect(asValue || asName, `${spec.id}: stem datum ${digits}° is not drawn (neither as a value nor as a named angle)`).toBe(true);
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
        // Each arc points unambiguously into one sector and stays inside it.
        for (const angle of drawing.angles) expect(angle.margin, `${id}: arc too close to a line`).toBeGreaterThan(3);
        for (const angle of drawing.angles) expect(angle.arcInside, `${id}: arc leaves its sector`).toBe(true);
      }
      for (const angle of drawing.angles) {
        expect(angle.span).toBeGreaterThan(0);
        expect(angle.span).toBeLessThan(180);
      }
      // One mark per drawn angle (U2-P3-A once marked its 38° angle twice, in two colours).
      const doubled: string[] = [];
      drawing.angles.forEach((a, i) => drawing.angles.slice(i + 1).forEach((b, j) => {
        if (relationOf(a, b) === 'same') doubled.push(`#${i} ${a.label ?? ''} ≡ #${i + 1 + j} ${b.label ?? ''}`);
      }));
      expect(doubled, `${id}: an angle is marked more than once`).toEqual([]);
    });
  }
});

describe('independent verification — unit 2 hand-derived solutions', () => {
  it('covers every unit-2 task exactly once', () => {
    expect(unit2Specs.map(spec => spec.id)).toEqual(unit2Questions.map(q => q.id));
  });

  it('exactly the pinned tasks have no written justification', () => {
    const without = unit2Questions.filter(q => asList(q.expected.justification).length === 0).map(q => q.id);
    expect(without).toEqual(Object.keys(NO_WRITTEN_JUSTIFICATION));
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

      it('the cited theorems are exactly the relations the derivation uses', async () => {
        const texts = asList(q.expected.justification);
        for (const text of texts) {
          for (const forbidden of THEOREM_GUARDRAILS.forbiddenStandaloneClaims) expect(text).not.toContain(forbidden);
        }
        if (spec.id === 'U2-P2-D') {
          // Two routes, each named as an ordered pair of relations — exactly the relations of the
          // step chains A → A↓ → α and A → A× → α. The page draws only ∠A and α, so the middle
          // angles are added to a probe copy of the same figure (A↓: the same sector on the other
          // line; A×: the opposite sector at ∠A's vertex), and every relation is read from the
          // probe's SVG.
          const angles = namedAngles(spec);
          const drawing = drawingOf(spec.id);
          expect(drawing.marks, `${spec.id}: only ∠A and α are marked (finding the routes is the task)`).toHaveLength(2);
          const [a, alpha] = drawing.marks as [AngleMark, AngleMark];
          const probeMarks: AngleMark[] = [
            a,
            { intersection: a.intersection === 'top' ? 'bottom' : 'top', sector: a.sector },
            { intersection: a.intersection, sector: ((a.sector + 2) % 4) as AngleMark['sector'] },
            alpha,
          ];
          const { ParallelLinesDiagram } = await import('../../src/geometry/ParallelLinesDiagram');
          const probeProps: ParallelLinesDiagramProps = { ...(drawing.props as ParallelLinesDiagramProps), angleMarks: probeMarks };
          const probeSvg = renderToStaticMarkup(createElement(ParallelLinesDiagram, probeProps));
          const probe = readParallelDrawing(probeSvg.slice(probeSvg.indexOf('<svg')), probeProps).angles;
          const [pA, pDown, pCross, pAlpha] = probe as [DrawnAngle, DrawnAngle, DrawnAngle, DrawnAngle];
          expect([relationOf(pA, angles.get('A')!), relationOf(pAlpha, angles.get('α')!)], `${spec.id}: the probe's ∠A and α are the drawn ones`).toEqual(['same', 'same']);
          const drawnRoutes = [[relationOf(pA, pDown), relationOf(pDown, pAlpha)], [relationOf(pA, pCross), relationOf(pCross, pAlpha)]];
          expect(drawnRoutes).toEqual([['corresponding', 'vertical'], ['vertical', 'corresponding']]);
          expect(texts, `${spec.id}: one text per route`).toHaveLength(2);
          for (const route of texts) {
            for (const forbidden of THEOREM_GUARDRAILS.forbiddenStandaloneClaims) {
              expect(route, `${spec.id}: route "${route}" states „${forbidden}” without the parallel condition`).not.toContain(forbidden);
            }
          }
          expect(texts.map(relationsNamed), `${spec.id}: relations named by each route`).toEqual(drawnRoutes);
          return;
        }
        if (texts.length === 0) {
          // Only pinned tasks may omit the justification, and none of them asks the student to justify.
          expect(NO_WRITTEN_JUSTIFICATION[spec.id], `${spec.id}: key has no justification and the task is not pinned as allowed to omit one`).toBeDefined();
          expect(q.stem, `${spec.id}: the stem asks „נמקו” but the key has no justification`).not.toContain('נמקו');
          return;
        }
        expect(NO_WRITTEN_JUSTIFICATION[spec.id], `${spec.id}: pinned as having no justification, but the key has one`).toBeUndefined();
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

      it(`drawn angles agree with the computed measures on acute / obtuse (SPEC 10.3)${regressionNote(spec.id)}`, () => {
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

    // SPEC 7 / SPEC 14: every equation between angle expressions has a justification lane, and the
    // theorem written there justifies exactly the equality built — the drawn relation of the two
    // angles the equation equates (one justification per equation, in order).
    it(`${spec.id}: has a justification lane and a justification that names the relation behind the equation`, () => {
      expect(q.justificationLane, `${spec.id}: SPEC 7 requires a justification lane next to the equation`).toBe(true);
      const drawn = spec.equations!.map(({ left, right, kind }) => {
        const relation = relationOf(markCarrying(spec.id, left), markCarrying(spec.id, right));
        const fits: Relation[] = kind === 'equal' ? ['corresponding', 'alternate', 'vertical'] : ['adjacent'];
        expect(fits, `${spec.id}: ${left} / ${right} are drawn as ${relation}, which does not give a ${kind} equation`).toContain(relation);
        return relation;
      });
      const texts = asList(q.expected.justification);
      expect(texts.map(theoremKind), `${spec.id}: theorem cited for each equation`).toEqual(drawn);
      for (const text of texts) {
        expect(distinct(relationsNamed(text)), `${spec.id}: "${text}" must name one relation only`).toEqual([theoremKind(text)]);
      }
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

  // The letters used to follow the table's row order (א = corresponding, ב = alternate, …), which
  // handed the student the answer; they are now shuffled, so this checks the same consistency
  // without fixing the order, and additionally that the order is NOT the row order.
  it('U2-P3-A: table rows, drawn letters א–ד and answer keys describe the same four relations, and the letters do not give away the rows', () => {
    const q = byId(unit2Questions, 'U2-P3-A');
    const rowRelation = { 'מתאימה': 'corresponding', 'מתחלפת': 'alternate', 'קודקודית': 'vertical', 'צמודה': 'adjacent' } as const;
    expect((q.tableRows ?? []).map(row => row.relation)).toEqual(['מתאימות', 'מתחלפות', 'קודקודיות', 'צמודות']);
    expect(Object.keys(q.expected.values ?? {})).toEqual(Object.keys(rowRelation));
    const drawing = drawingOf('U2-P3-A');
    // The given angle once, then the four letters — no other mark.
    expect(drawing.angles.map(a => a.label)).toEqual(['38°', 'א', 'ב', 'ג', 'ד']);
    const ref = drawing.angles[0]!;
    const letterOf = new Map(drawing.angles.slice(1).map(angle => [relationOf(ref, angle), angle.label]));
    // Each relation of the table is drawn exactly once.
    expect([...letterOf.keys()].sort()).toEqual(['adjacent', 'alternate', 'corresponding', 'vertical']);
    // Each row's key value is the hand-derived measure of the letter drawn in that row's relation.
    const { measures } = unit2Specs.find(spec => spec.id === 'U2-P3-A')!.derive();
    for (const [row, relation] of Object.entries(rowRelation)) {
      expect(q.expected.values?.[row], `U2-P3-A row ${row}`).toBe(measures[letterOf.get(relation)!]);
    }
    // No letter sits at the position of its own table row.
    Object.values(rowRelation).forEach((relation, row) => {
      expect(letterOf.get(relation), `U2-P3-A: the ${relation} angle is lettered in table-row order`).not.toBe(['א', 'ב', 'ג', 'ד'][row]);
    });
  });

  it('U2-P3-B: the table states the same relations the drawing shows', () => {
    const q = byId(unit2Questions, 'U2-P3-B');
    expect(q.tableRows).toEqual([
      { label: '∠A', relation: 'נתונה', value: '52°' },
      { label: '∠D', relation: 'מתאימה ל־∠A', value: '' },
      { label: '∠F', relation: 'צמודה ל־∠D', value: '' },
    ]);
  });

  it('every direct-theorem computation states its parallel condition in words, not only through the drawing\'s marks', () => {
    const drawingOnly = unit2Specs
      .filter(spec => spec.parallelText === null && spec.steps.some(([, , r]) => r === 'corresponding' || r === 'alternate'))
      .map(spec => spec.id);
    expect(drawingOnly).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Unit 4 — converse theorems.
// ---------------------------------------------------------------------------

const CONVERSE = {
  corresponding: THEOREMS.correspondingConverse.text,
  alternate: THEOREMS.alternateConverse.text,
} as const;

/** A sentence that invokes a converse theorem, by name or by its canonical wording. */
const citesConverse = (sentence: string) =>
  sentence.includes('המשפט ההפוך') || Object.values(CONVERSE).some(text => sentence.includes(withoutFinalPeriod(text)));

/** The imperative that turns a unit-4 stem from givens into the question. */
const QUESTION_VERB = /קבעו|מצאו|הוכיחו|בחרו|חשבו/;

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
      // The corresponding pair is equal ⇒ the converse applies; asserted inside it() (measures A = B).
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
      // The alternate pair is equal ⇒ the converse applies; asserted inside it() (measures C = D).
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

      it('parallelism is the conclusion, never a given: no parallel marks, and nothing before the question states it', () => {
        expect(q.diagram?.parallelGiven).toBe(false);
        expect(drawingOf(spec.id).chevrons).toEqual([]);
        const [first, second] = q.diagram?.lineLabels ?? [];
        const conclusion = `${first} ∥ ${second}`;
        const verb = QUESTION_VERB.exec(q.stem);
        expect(verb, `${spec.id}: stem has no question verb`).not.toBeNull();
        const givens = q.stem.slice(0, verb!.index);
        const question = q.stem.slice(verb!.index);
        // The givens (everything before the question verb) state no parallelism at all — neither the
        // symbol nor the word — and p ∥ q appears only as what is asked.
        expect(givens, `${spec.id}: givens "${givens}"`).not.toMatch(/∥|מקביל/);
        expect(question).toContain(conclusion);
        expect(q.expected.conclusion).toBe(conclusion);
        expect(spec.conclusion).toBe(q.expected.conclusion);
      });

      it('the cited reason is the converse theorem matching the drawn relation', () => {
        // The converse named in the spec is the relation of the drawn pair, not a hand-typed label.
        const angles = namedAngles(spec);
        const [from, to] = spec.steps[0]!;
        expect(relationOf(angles.get(from)!, angles.get(to)!), `${spec.id}: drawn relation of ∠${from} / ∠${to}`).toBe(spec.converse);
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
          // Every key sentence that invokes the converse names no relation other than the drawn one,
          // and at least one names it: the cited converse is the CORRESPONDING one, not the alternate.
          const sentences = [...asList(q.expected.justification), ...asList(q.expected.reason)].flatMap(sentencesOf);
          const citations = sentences.filter(citesConverse).map(sentence => ({ sentence, named: distinct(relationsNamed(sentence)) }));
          expect(citations.length, `${spec.id}: the key never invokes the converse`).toBeGreaterThan(0);
          for (const { sentence, named } of citations) {
            expect([[], [spec.converse]], `${spec.id}: "${sentence}" cites the converse of ${named.join(' + ')}`).toContainEqual(named);
          }
          expect(citations.filter(({ named }) => named.length === 1).length, `${spec.id}: no converse citation says which converse`).toBeGreaterThan(0);
          // Parallelism is concluded, so a direct theorem (which presupposes it) is never cited.
          for (const sentence of sentences) {
            expect(sentence, `${spec.id}: cites a direct theorem`).not.toContain(CORRESPONDING_DIRECT);
            expect(sentence, `${spec.id}: cites a direct theorem`).not.toContain(ALTERNATE_DIRECT);
          }
          const equation = /(\S+ \+ \d+ = \S+ − \d+)/.exec(justification)?.[1];
          expect(equation).toBeDefined();
          expect(equivalent(parseEquation(equation!), parseEquation(`${left} = ${right}`))).toBe(true);
        } else {
          const reason = asList(q.expected.reason).join(' ');
          // Exactly the canonical converse sentence (SPEC 3.2), character for character.
          expect(reason).toBe(CONVERSE[spec.converse]);
        }
      });

      it(`drawn angles agree with the computed measures on acute / obtuse (SPEC 10.3)${regressionNote(spec.id)}`, () => {
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

  // Regression CI-13: collision avoidance once pushed the ∠C badge across line r, into the angle
  // ABOVE r (same-side interior with ∠B). Badges are now confined to their own sector.
  it('U4-P2-D: ∠B and ∠C are drawn as a corresponding pair relative to q and r (regression: CI-13)', () => {
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

/**
 * A unit-3 relation, as the drawing decides it. The booklet calls both interior and exterior
 * alternate pairs „מתחלפות” (unit 1), so a written „מתחלפות” matches either — but each hand-read
 * claim below names the exact drawn relation, and the drawing must show exactly that.
 */
type Claim3Kind = Kind | 'alternate-exterior';
type Claim = readonly [string, string, Claim3Kind];
const asWrittenKind = (kind: Claim3Kind): Kind => (kind === 'alternate-exterior' ? 'alternate' : kind);

/** Relations each unit-3 task relies on, read by hand from its stem / proof / key notes. */
const unit3Claims: Record<string, Claim[]> = {
  'U3-P1-A': [['A', 'B', 'corresponding']],
  'U3-P1-B': [['C', 'D', 'corresponding']],
  'U3-P1-C': [['A', 'B', 'corresponding'], ['C', 'D', 'alternate'], ['E', 'F', 'vertical']],
  // Corresponding then vertical lands on the alternate angle: the one-step route is also correct.
  'U3-P1-D': [['A', 'B', 'corresponding'], ['B', 'C', 'vertical'], ['A', 'C', 'alternate-exterior']],
  'U3-P2-A': [['A', 'B', 'alternate']],
  'U3-P2-B': [['A', 'B', 'corresponding'], ['B', 'C', 'vertical']],
  'U3-P2-C': [['A', 'B', 'alternate'], ['B', 'C', 'vertical']],
  'U3-P2-D': [['A', 'B', 'corresponding']],
  'U3-P3-A': [['A', 'B', 'corresponding'], ['B', 'C', 'vertical'], ['A', 'C', 'alternate-exterior']],
  'U3-P3-B': [['A', 'B', 'alternate'], ['B', 'C', 'adjacent']],
  'U3-P3-C': [['A', 'B', 'corresponding'], ['B', 'D', 'vertical'], ['A', 'D', 'alternate']],
  // Proof ב rests on ∠A / ∠C being alternate (true in the drawing) but omits p ∥ q (regression: CI-11).
  'U3-P3-D': [['A', 'B', 'corresponding'], ['B', 'C', 'vertical'], ['A', 'C', 'alternate']],
};

/** An angle pair as written: '∠A = ∠B', '∠B + ∠C = 180°' or 'הזוויות ∠A ו־∠C'. */
const WRITTEN_PAIR = /∠([A-Z]) (?:=|\+) ∠([A-Z])|∠([A-Z]) ו־∠([A-Z])/g;

/**
 * Relation claims in one text, in reading order: each written pair takes the relation phrase(s)
 * that follow it up to the next pair ('∠A = ∠B כי הן זוויות מתאימות …, ו־∠B = ∠C כי הן זוויות
 * קודקודיות'). A pair followed by no relation (e.g. 'מכלל המעבר') makes no claim; a pair followed by
 * two different relations is ambiguous and fails loudly.
 */
function claimsInText(text: string): Array<readonly [string, string, Kind]> {
  const pairs = [...text.matchAll(WRITTEN_PAIR)];
  return pairs.flatMap((match, i) => {
    const end = pairs[i + 1]?.index ?? text.length;
    const named = distinct(relationsNamed(text.slice(match.index + match[0].length, end)));
    if (named.length > 1) throw new Error(`"${text}": the pair ${match[0]} is followed by ${named.join(' + ')}`);
    const [a, b] = match[1] ? [match[1], match[2]!] : [match[3]!, match[4]!];
    return named.length === 1 ? [[a, b, named[0]!] as const] : [];
  });
}

/** Relation claims written in the content's key: proofs, reasons, chosen reasons, the teacher note, and proof-table rows (blanks filled from the key). */
function writtenClaims(q: Unit3Question): Array<readonly [string, string, Kind]> {
  const keyReasons = asList(q.expected.reason);
  const texts = [
    ...(q.expected.proof ?? []),
    ...keyReasons.flatMap(sentencesOf),
    ...asList(q.teacherNote).flatMap(sentencesOf),
    // A chosen reason justifies the stem's target claim.
    ...(q.expected.choice && q.choices ? [`${q.diagram.target} — ${q.expected.choice}`] : []),
    ...(q.proofLines ?? []).map(row => {
      const claim = row.claim.includes('___') ? keyReasons.join(' ') : row.claim;
      const reason = row.reason?.includes('___') ? keyReasons.join(' ') : row.reason ?? '';
      return `${claim} — ${reason}`;
    }),
  ];
  return texts.flatMap(claimsInText).filter((claim, index, all) => all.findIndex(other => other.join() === claim.join()) === index);
}

/** Every reason a unit-3 table row or key line may cite: exactly a canonical constant of theorems.ts. */
const CANONICAL_REASONS: readonly string[] = [
  THEOREMS.correspondingDirect.text,
  THEOREMS.alternateDirect.text,
  ...Object.values(REASONS),
];

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
      // What the teacher key writes must be a subset of these hand-read claims — and the key must
      // write at least one, so this check can never pass vacuously.
      const written = writtenClaims(q);
      expect(written.length, `${q.id}: the key states no angle relation`).toBeGreaterThan(0);
      const handWritten = claims.map(([a, b, kind]) => [a, b, asWrittenKind(kind)] as const);
      for (const claim of written) expect(handWritten).toContainEqual(claim);
    });

    it(`${q.id}: corresponding / alternate equality is only used with the parallel condition available`, () => {
      const drawing = drawingOf(q.id);
      const usesDirect = claims.some(([, , kind]) => kind !== 'vertical' && kind !== 'adjacent');
      if (!usesDirect) return;
      if (q.diagram.parallelGivens.length > 0) {
        expect(drawing.chevrons).toEqual([0, 1]);
        // SPEC 14: the parallel condition is stated in words — in the stem, or as the table's
        // given row — not only by the drawing's marks.
        const statedGivens = [q.stem, ...(q.proofLines ?? []).filter(row => row.reason === REASONS.given).map(row => row.claim)].join(' ');
        expect(statedGivens, `${q.id}: the parallel condition is stated in words`).toContain(q.diagram.parallelGivens[0]!);
        return;
      }
      // U3-P2-D: parallelism is exactly the missing datum the student must choose.
      const parallel = `${q.diagram.lineLabels[0]} ∥ ${q.diagram.lineLabels[1]}`;
      expect(drawing.chevrons).toEqual([]);
      expect(q.expected.choice).toBe(parallel);
      const reason = asList(q.expected.reason).join(' ');
      expect(reason).toContain(`הנתון ${parallel} מספיק`);
      expect(reason).toContain(THEOREMS.correspondingDirect.text);
    });

    // Regression CI-12 (U3-P1-C once named one drawn angle both ∠A and ∠C).
    it(`${q.id}: different letters never name the same drawn angle${q.id === 'U3-P1-C' ? ' (regression: CI-12)' : ''}`, () => {
      const labelled = drawingOf(q.id).angles.filter(angle => angle.label);
      const clashes: string[] = [];
      labelled.forEach((a, i) => labelled.slice(i + 1).forEach(b => {
        if (a.label !== b.label && relationOf(a, b) === 'same') clashes.push(`${a.label}≡${b.label}`);
      }));
      expect(clashes).toEqual([]);
    });

    it(`${q.id}: every reason in a proof table and every key reason is a canonical sentence of theorems.ts`, () => {
      for (const row of q.proofLines ?? []) {
        if (row.reason === undefined || row.reason.includes('___')) continue;
        expect(CANONICAL_REASONS, `${q.id}: "${row.reason}"`).toContain(row.reason);
      }
      for (const text of [...(q.choices ?? []), ...(q.expected.proof ?? []), ...asList(q.expected.reason), ...asList(q.teacherNote)]) {
        // The canonical direct theorems are quoted exactly — never with an added „זו לזו”.
        expect(text, q.id).not.toMatch(/בין (ה)?ישרים (ה)?מקבילים שוות זו לזו/);
        if (text.includes('בין ישרים מקבילים שוות')) {
          expect([THEOREMS.correspondingDirect.text, THEOREMS.alternateDirect.text].some(t => text.includes(t)), `${q.id}: "${text}"`).toBe(true);
        }
        if (text.includes('קודקודיות שוות')) expect(text, q.id).toContain(REASONS.vertical);
      }
      // A key line 'claim — reason' cites a canonical reason verbatim.
      for (const line of q.expected.proof ?? []) {
        const reason = line.split(' — ')[1];
        if (reason !== undefined) expect(CANONICAL_REASONS, `${q.id}: "${line}"`).toContain(reason);
      }
    });
  }

  // D2 — a chain 'corresponding then vertical' always ends on the angle ALTERNATE to the first one,
  // so a one-step alternate proof is correct too; the key must say so (read from the drawing).
  it('unit 3: wherever the proven pair is itself corresponding / alternate in the drawing, the key accepts the one-step route', () => {
    let checked = 0;
    for (const q of unit3Questions) {
      const target = /^∠([A-Z]) = ∠([A-Z])$/.exec(q.diagram.target);
      if (!target || q.diagram.parallelGivens.length === 0 || !(q.expected.proof ?? []).length) continue;
      const [, x, z] = target as unknown as [string, string, string];
      const byLabel = new Map(drawingOf(q.id).angles.map(angle => [angle.label, angle]));
      if (!byLabel.has(x) || !byLabel.has(z)) continue;
      const relation = relationOf(byLabel.get(x)!, byLabel.get(z)!);
      if (relation !== 'corresponding' && relation !== 'alternate' && relation !== 'alternate-exterior') continue;
      checked += 1;
      const written = asList(q.teacherNote).flatMap(sentencesOf).flatMap(claimsInText);
      expect(written, `${q.id}: the note names the one-step route`).toContainEqual([x, z, asWrittenKind(relation)]);
      expect(q.teacherNote, q.id).toContain(relation === 'corresponding' ? THEOREMS.correspondingDirect.text : THEOREMS.alternateDirect.text);
      expect(q.teacherNote, q.id).toContain('שתי הדרכים מתקבלות');
    }
    expect(checked, 'U3-P1-D, U3-P3-A and U3-P3-C prove an alternate pair through ∠B').toBe(3);
  });

  it('U3-P1-D: the key gives the verdict the task asks for (קבעו אם)', () => {
    const q = byId(unit3Questions, 'U3-P1-D');
    expect(q.stem).toContain('קבעו אם ∠A = ∠C');
    expect(q.expected.conclusion).toBe('כן, ∠A = ∠C.');
  });

  it('U3-P1-A: the stem does not name the pair type, and the only distractor with the pair type lacks the parallel condition', () => {
    const q = byId(unit3Questions, 'U3-P1-A');
    expect(q.stem).not.toMatch(/מתאימות|מתחלפות/);
    const byLabel = new Map(drawingOf(q.id).angles.map(angle => [angle.label, angle]));
    expect(relationOf(byLabel.get('A')!, byLabel.get('B')!)).toBe('corresponding');
    expect(q.expected.choice).toBe(THEOREMS.correspondingDirect.text);
    const sameType = (q.choices ?? []).filter(choice => choice.includes('מתאימות'));
    expect(sameType).toHaveLength(2);
    expect(sameType.filter(choice => !choice.includes('מקבילים'))).toEqual(['זוויות מתאימות שוות.']);
  });

  it('U3-P1-C: four reasons for three claims — exactly one reason fits no claim', () => {
    const q = byId(unit3Questions, 'U3-P1-C');
    expect(q.stem.startsWith(`בשרטוט ${q.diagram.parallelGivens[0]}.`)).toBe(true);
    const used = (q.expected.proof ?? []).map(line => line.split(' — ')[1]!);
    expect(new Set(used).size).toBe(3);
    for (const reason of used) expect(q.choices).toContain(reason);
    const unused = (q.choices ?? []).filter(choice => !used.includes(choice));
    expect(unused).toEqual([REASONS.adjacent]);
    // No drawn pair among the claims is adjacent, so the spare reason really fits nothing.
    expect(unit3Claims['U3-P1-C']!.map(([, , kind]) => kind)).not.toContain('adjacent');
    // The bank does not list the reasons in the order of the claims.
    expect(q.choices!.filter(choice => used.includes(choice))).not.toEqual(used);
  });

  // The printed order must be a wrong proof, and the key must accept EVERY valid order —
  // enumerated here from first principles: a row may only use what earlier rows established.
  it('U3-P2-B: the printed order is not a proof, and the key accepts exactly the valid orders', () => {
    const q = byId(unit3Questions, 'U3-P2-B');
    const rows = q.proofLines ?? [];
    expect(rows).toHaveLength(4);
    const parallelRow = rows.findIndex(row => /^[a-z] ∥ [a-z]$/.test(row.claim));
    /** Rows (by printed index) that must come before row i. */
    const prerequisites = rows.map((row, i): number[] => {
      if (row.reason === REASONS.given || row.reason === REASONS.vertical) return [];
      if (row.reason === THEOREMS.correspondingDirect.text || row.reason === THEOREMS.alternateDirect.text) return [parallelRow];
      if (row.reason === REASONS.transitivity) {
        const [, x, z] = /^∠([A-Z]) = ∠([A-Z])$/.exec(row.claim)!;
        const equalities = rows.map((other, j) => ({ j, m: /^∠([A-Z]) = ∠([A-Z])$/.exec(other.claim) })).filter(e => e.m && e.j !== i);
        // X = Y and Y = Z for one middle angle Y.
        for (const first of equalities) {
          const [, a, b] = first.m!;
          const y = a === x ? b : b === x ? a : null;
          if (!y) continue;
          const second = equalities.find(e => e.j !== first.j && new Set([e.m![1], e.m![2]]).has(y) && new Set([e.m![1], e.m![2]]).has(z!));
          if (second) return [first.j, second.j];
        }
        throw new Error(`no chain for ${row.claim}`);
      }
      throw new Error(`unknown reason "${row.reason}"`);
    });
    // The table rows must also be true of the drawing (vertical / corresponding as claimed).
    const byLabel = new Map(drawingOf(q.id).angles.map(angle => [angle.label, angle]));
    expect(relationOf(byLabel.get('A')!, byLabel.get('B')!)).toBe('corresponding');
    expect(relationOf(byLabel.get('B')!, byLabel.get('C')!)).toBe('vertical');
    const permutations = (items: number[]): number[][] =>
      items.length <= 1 ? [items] : items.flatMap((item, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map(rest => [item, ...rest]));
    const validSequences = permutations([0, 1, 2, 3]).filter(sequence =>
      sequence.every((row, position) => prerequisites[row]!.every(pre => sequence.indexOf(pre) < position)));
    // As the student writes them: for each printed row (top to bottom), its place in the proof.
    const validFillings = validSequences.map(sequence => rows.map((_, i) => sequence.indexOf(i) + 1));
    expect(validFillings.length).toBe(3);
    expect(validFillings.map(f => f.join())).not.toContain([1, 2, 3, 4].join());
    expect([...(q.acceptedOrders ?? [])].map(f => f.join()).sort()).toEqual(validFillings.map(f => f.join()).sort());
    // The teacher reads every accepted filling in the key.
    const reason = asList(q.expected.reason).join(' ');
    for (const filling of validFillings) expect(reason).toContain(filling.join(', '));
    // The key's proof is one of the valid orders.
    const keyOrder = (q.expected.proof ?? []).map(line => rows.findIndex(row => line.startsWith(`${row.claim} — `)));
    expect(validSequences.map(s => s.join())).toContain(keyOrder.join());
  });

  // Every option of the data-sufficiency task is a datum about what is drawn; exactly one suffices.
  it('U3-P2-D: the options name only drawn objects, and only the parallelism of the lines bounding ∠A, ∠B suffices', () => {
    const q = byId(unit3Questions, 'U3-P2-D');
    const drawing = drawingOf(q.id);
    const choices = q.choices ?? [];
    expect(choices).toHaveLength(4);
    const drawnAngleLabels = drawing.angles.map(angle => angle.label);
    expect([...drawnAngleLabels].sort()).toEqual(['A', 'B']);
    const lineNames = q.diagram.lineLabels;
    for (const choice of choices) {
      for (const [, letter] of choice.matchAll(/∠([A-Z])/g)) expect(drawnAngleLabels, `${choice}`).toContain(letter);
      for (const [, name] of choice.matchAll(/\b([a-z])\b/g)) expect(lineNames, `${choice}`).toContain(name);
      expect(choice, 'no segment names in this topic').not.toMatch(/[A-Z]{2}/);
    }
    // ∠A and ∠B lie on one transversal (r) at its crossings with the two lines p and q.
    const [A, B] = ['A', 'B'].map(label => drawing.angles.find(angle => angle.label === label)!);
    expect(relationOf(A!, B!)).toBe('corresponding');
    expect(A!.transversal).toBe(0);
    const sufficient = `${lineNames[0]} ∥ ${lineNames[1]}`;
    const parallelChoices = choices.filter(choice => /^[a-z] ∥ [a-z]$/.test(choice));
    expect(parallelChoices).toContain(sufficient);
    expect(q.expected.choice).toBe(sufficient);
    // The other parallel option names the two transversals — and they are drawn parallel, so it is
    // a datum the drawing allows, but it says nothing about the lines that form ∠A and ∠B.
    const wrongPair = parallelChoices.filter(choice => choice !== sufficient);
    expect(wrongPair).toEqual([`${lineNames[2]} ∥ ${lineNames[3]}`]);
    expect(drawing.transversalDirs).toHaveLength(2);
    expect(lineAngleGap(drawing.transversalDirs[0]!, drawing.transversalDirs[1]!)).toBeLessThan(1e-6);
    // The option 'the angles are corresponding' is true of the drawing — and insufficient without p ∥ q.
    expect(choices.some(choice => choice.includes('מתאימות') && !/מקביל|∥/.test(choice))).toBe(true);
    const reason = asList(q.expected.reason).join(' ');
    expect(reason).toContain(`הנתון ${wrongPair[0]} אינו עוזר`);
    expect(reason).toContain('אינו מבטיח שוויון בלי נתון המקבילות');
  });

  it('U3-P3-C: ∠E lies on the other transversal, so it is genuinely unrelated to ∠A, ∠B, ∠D', () => {
    const q = byId(unit3Questions, 'U3-P3-C');
    const drawing = drawingOf('U3-P3-C');
    const byLabel = new Map(drawing.angles.map(angle => [angle.label, angle]));
    const E = byLabel.get('E')!;
    for (const other of ['A', 'B', 'D']) expect(relationOf(E, byLabel.get(other)!)).toBe('unrelated');
    expect(E.transversal).toBe(1);
    const mark = drawing.marks.find(item => item.label === 'E')!;
    expect(q.stem).toContain(`∠E = ${mark.value}`);
    expect(q.stem).toMatch(/קבעו אם הנתון ∠E = 35° נחוץ להוכחה, ונמקו/);
    expect(q.expected.unneededDatum).toBe(`∠E = ${mark.value}`);
    expect(asList(q.expected.reason).join(' ')).toMatch(/^הנתון ∠E = 35° אינו נחוץ להוכחה: .*הישר s.*הישר r/);
    // The proof itself never uses ∠E.
    expect((q.expected.proof ?? []).join(' ')).not.toContain('∠E');
  });

  it('U3-P3-C: the drawn ∠E agrees with its given 35° on acute / obtuse (SPEC 10.3) (regression: CI-9)', () => {
    const drawing = drawingOf('U3-P3-C');
    const index = drawing.marks.findIndex(mark => mark.label === 'E');
    expect(drawing.marks[index]!.value).toBe('35°');
    expect(acuteObtuseViolations([{ name: 'E', drawn: drawing.angles[index]!.span, measure: 35 }])).toEqual([]);
  });

  it('unit 3: every drawn numeric value agrees with its sector on acute / obtuse', () => {
    for (const q of unit3Questions) {
      const drawing = drawingOf(q.id);
      drawing.marks.forEach((mark, index) => {
        if (!mark.value || !isDegreeValue(mark.value)) return;
        expect(acuteObtuseViolations([{ name: `${q.id} ${mark.label}`, drawn: drawing.angles[index]!.span, measure: Number.parseInt(mark.value, 10) }])).toEqual([]);
      });
    }
  });

  // Regression CI-11: the key once rejected proof ב by claiming ∠A and ∠C are NOT alternate.
  // Corresponding + vertical always gives an alternate pair; proof ב's real flaw is that it
  // concludes equality from "alternate" alone, without p ∥ q (the SPEC 3.3 misconception).
  it('U3-P3-D: ∠A and ∠C are alternate in the drawing, and the key says so and faults proof ב for the missing p ∥ q (regression: CI-11)', () => {
    const q = byId(unit3Questions, 'U3-P3-D');
    const byLabel = new Map(drawingOf('U3-P3-D').angles.map(angle => [angle.label, angle]));
    expect(relationOf(byLabel.get('A')!, byLabel.get('C')!)).toBe('alternate');
    expect(q.stem.startsWith('נתון p ∥ q.')).toBe(true);
    const reason = asList(q.expected.reason).join(' ');
    expect(reason).not.toContain('אינן זוג זוויות מתחלפות');
    expect(reason).toContain('∠A ו־∠C אכן מתחלפות');
    expect(reason).toContain(`„${THEOREMS.alternateDirect.text}”`);
    expect(reason).toContain('לא נעשה שימוש בנתון שהישרים p ו־q מקבילים');
    expect(reason).toContain('תיקון להוכחה ב: ∠A = ∠C כי הן זוויות מתחלפות בין הישרים המקבילים p ו־q');
    expect((q.diagram.givens ?? []).join(' ')).not.toMatch(/not an alternate pair/);
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

// ---------------------------------------------------------------------------
// Unit 1 — identification keys, re-derived from the RENDERED drawings.
// Unit 1 has no computation, but every key names angles, pairs or locations; each one is read
// back here from the SVG alone (drawn lines, crossings, arcs and label positions) and classified
// from first principles with relationOf — never from the page's sector indices.
// ---------------------------------------------------------------------------

type Unit1Figure = { svg: string; props: ParallelLinesDiagramProps };

function unit1Figures(): Map<string, Unit1Figure[]> {
  const figures = new Map<string, Unit1Figure[]>();
  for (const Page of [Unit1Page1, Unit1Continuation]) {
    captured.diagrams.length = 0;
    const html = renderToStaticMarkup(createElement(Page));
    const starts = [...html.matchAll(/<svg class="geometry-diagram/g)].map(m => m.index);
    if (starts.length !== captured.diagrams.length) throw new Error(`unit 1: ${starts.length} SVGs but ${captured.diagrams.length} captured diagrams`);
    starts.forEach((start, index) => {
      const entry = captured.diagrams[index]!;
      if (entry.kind !== 'parallel') throw new Error('unit 1 draws only two-line figures');
      const id = /data-task-id="([^"]+)"/.exec(html.slice(html.lastIndexOf('data-task-id="', start)))![1]!;
      figures.set(id, [...(figures.get(id) ?? []), { svg: html.slice(start, html.indexOf('</svg>', start)), props: entry.props }]);
    });
  }
  return figures;
}

const u1Figures = unit1Figures();
const u1Figure = (id: string, index = 0) => {
  const figure = u1Figures.get(id)?.[index];
  if (!figure) throw new Error(`no unit-1 figure ${index} for ${id}`);
  return figure;
};
const u1Drawing = (id: string, index = 0) => readParallelDrawing(u1Figure(id, index).svg, u1Figure(id, index).props);
const u1Key = (id: string) => {
  const entry = teacherAnswerKey.find(item => item.id === id);
  if (!entry) throw new Error(`no key for ${id}`);
  return entry;
};
const u1KeyText = (id: string) => [asList(u1Key(id).answer as string | string[]).join(' '), u1Key(id).note ?? ''].join(' ');

/**
 * Number-only angle labels (the eight-angle figures draw no arcs): the angle a number names is the
 * sector of the nearest crossing that the number sits in — exactly how a student reads it.
 */
function indexLabelledAngles(svg: string): DrawnAngle[] {
  const lines = drawnLines(svg);
  const parallels = lines.slice(0, 2);
  const transversal = lines[2]!;
  const crossings = parallels.map(line => intersect(line, transversal));
  const transDeg = direction(transversal.a, transversal.b);
  // A 9 pt label's visual centre sits about a third of its size (≈ 4 px) above the baseline.
  const baselineToCentre = 4;
  return markChunks(svg).map(chunk => {
    const m = /<text class="angle-label-text angle-label-text--index" x="(-?[\d.]+)" y="(-?[\d.]+)"[^>]*>([\s\S]*?)<\/text>/.exec(chunk);
    if (!m) throw new Error('an eight-angle mark without a number label');
    const at = { x: Number(m[1]), y: Number(m[2]) - baselineToCentre };
    const parallelLine = Math.hypot(at.x - crossings[0]!.x, at.y - crossings[0]!.y) < Math.hypot(at.x - crossings[1]!.x, at.y - crossings[1]!.y) ? 0 : 1;
    const vertex = crossings[parallelLine]!;
    const lineDeg = direction(parallels[parallelLine]!.a, parallels[parallelLine]!.b);
    const sector = locateSector(direction(vertex, at), lineDeg, transDeg);
    const interior = dot(unitVector(sector.transRay.deg), minus(crossings[1 - parallelLine]!, vertex)) > 0;
    return {
      vertex: parallelLine === 0 ? 'top' : 'bottom',
      parallelLine,
      transversal: 0,
      lineSide: sector.lineRay.side,
      transSide: sector.transRay.side,
      interior,
      span: sector.width,
      label: drawnText(m[3]!),
      margin: sector.margin,
      arcInside: true,
    };
  });
}

const RELATION_WORD: Partial<Record<Relation, string>> = {
  corresponding: 'מתאימות',
  alternate: 'מתחלפות',
  'alternate-exterior': 'מתחלפות',
};
const isAlternate = (relation: Relation) => relation === 'alternate' || relation === 'alternate-exterior';

/** Where an angle lies, in the words a key uses: above / below its line, right / left of the transversal. */
function placeWords(bisectorDeg: number, lineDeg: number, transDeg: number, lineName: string, transName: string) {
  const b = unitVector(bisectorDeg);
  const u = unitVector(lineDeg);
  const v = unitVector(transDeg);
  // Normals pointing down the page (SVG y grows downward) and to the right of the page.
  const down = u.x >= 0 ? { x: -u.y, y: u.x } : { x: u.y, y: -u.x };
  const right = v.y >= 0 ? { x: v.y, y: -v.x } : { x: -v.y, y: v.x };
  if (down.y <= 0 || right.x <= 0) throw new Error('a line is drawn vertical or horizontal: no above / right');
  const below = dot(b, down) > 0;
  const onRight = dot(b, right) > 0;
  return `${below ? 'מתחת לישר' : 'מעל הישר'} ${lineName} ו${onRight ? 'מימין' : 'משמאל'} לישר ${transName}`;
}

describe('independent verification — unit 1 identification keys match the rendered drawings', () => {
  it('every unit-1 task with a figure is read back here (U1-P2-E is statements only)', () => {
    expect([...u1Figures.keys()].sort()).toEqual(unit1Questions.map(q => q.id).filter(id => id !== 'U1-P2-E').sort());
  });

  it('the place words are right on a hand-checkable figure (horizontal line, transversal rising to the right)', () => {
    // SVG y grows down: 90° points down the page, 300° up and to the right.
    expect(placeWords(90 + 45, 0, 300, 'm', 't')).toBe('מתחת לישר m ומשמאל לישר t');
    expect(placeWords(-60 + 45, 0, 300, 'm', 't')).toBe('מעל הישר m ומימין לישר t');
  });

  it.each([
    ['U1-P1-B', 'corresponding'],
    ['U1-P1-C', 'alternate'],
  ] as const)('%s: the key names the location of the %s mate of the marked angle, read from the drawing', (id, relation) => {
    const { svg, props } = u1Figure(id);
    const lines = drawnLines(svg);
    const [top, bottom] = [lines[0]!, lines[1]!];
    const transversal = lines[2]!;
    // The page-1 figures carry no parallel marks but are drawn parallel: the mate is found by direction.
    expect(lineAngleGap(direction(top.a, top.b), direction(bottom.a, bottom.b))).toBeLessThan(1e-6);
    const arcs = drawnArcs(svg);
    expect(arcs, `${id}: exactly one marked angle`).toHaveLength(1);
    const drawn = readParallelDrawing(svg, props).angles[0]!;
    expect(drawn.vertex).toBe('top');
    // The first alternate-angle task starts from an angle BETWEEN the lines (easy → hard).
    if (relation === 'alternate') expect(drawn.interior, `${id}: the given angle lies between the lines`).toBe(true);
    const bisector = arcs[0]!.thetaStart + arcs[0]!.sweep / 2;
    const mateBisector = relation === 'corresponding' ? bisector : bisector + 180;
    const bottomName = (props.lineLabels ?? [])[1]!;
    const words = placeWords(mateBisector, direction(bottom.a, bottom.b), direction(transversal.a, transversal.b), bottomName, props.transversalLabel!);
    expect(typeof u1Key(id).answer).toBe('string');
    expect(u1Key(id).answer as string, `${id}: the key must say where the mate is`).toContain(words);
    // The mate the key describes stands in the asked relation to the marked angle.
    const mate: DrawnAngle = {
      ...drawn,
      vertex: 'bottom',
      parallelLine: 1,
      lineSide: relation === 'corresponding' ? drawn.lineSide : ((1 - drawn.lineSide) as 0 | 1),
      transSide: relation === 'corresponding' ? drawn.transSide : ((1 - drawn.transSide) as 0 | 1),
    };
    expect(relationOf(drawn, mate)).toBe(relation);
  });

  it('U1-P1-D: each arc form marks one pair, and the key classifies each pair as drawn', () => {
    const { svg } = u1Figure('U1-P1-D');
    const angles = u1Drawing('U1-P1-D').angles;
    const forms = markChunks(svg).map(chunk => /angle-mark--(single|double|dashed)/.exec(chunk)![1]!);
    expect(forms).toHaveLength(angles.length);
    const keyByForm: Record<string, string> = { single: 'קשת אחת', double: 'שתי קשתות', dashed: 'קשת מקווקוות' };
    const key = asList(u1Key('U1-P1-D').answer as string[]);
    const words = new Set<string>();
    for (const form of ['single', 'double', 'dashed']) {
      const pair = angles.filter((_, i) => forms[i] === form);
      expect(pair.map(a => a.vertex).sort(), `${form}: one angle at each crossing`).toEqual(['bottom', 'top']);
      const word = RELATION_WORD[relationOf(pair[0]!, pair[1]!)] ?? 'אינן שייכות לאחד משני הסוגים';
      words.add(word);
      expect(key).toContain(`${keyByForm[form]!} — ${word}`);
    }
    expect(words.size, 'the three pairs are one of each kind').toBe(3);
  });

  it.each([
    ['U1-P1-E', 'corresponding'],
    ['U1-P2-A', 'alternate'],
  ] as const)('%s: every matched pair is %s in the drawing, the matching is complete, and no pair sits on one printed row', (id, relation) => {
    const angles = indexLabelledAngles(u1Figure(id).svg);
    expect(angles.map(a => a.label).sort()).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
    for (const angle of angles) expect(angle.margin, `${id} ∠${angle.label ?? ''}: the number sits clearly inside one angle`).toBeGreaterThan(4);
    const byLabel = new Map(angles.map(a => [a.label, a]));
    const matches = (a: DrawnAngle, b: DrawnAngle) => (relation === 'corresponding' ? relationOf(a, b) === 'corresponding' : isAlternate(relationOf(a, b)));
    const expected = ['1', '2', '3', '4'].map(top => {
      expect(byLabel.get(top)!.vertex, `∠${top} is at the top crossing`).toBe('top');
      const partners = angles.filter(b => b.vertex === 'bottom' && matches(byLabel.get(top)!, b)).map(b => b.label);
      expect(partners, `${id}: ∠${top} has exactly one partner`).toHaveLength(1);
      return `∠${top} ↔ ∠${partners[0]!}`;
    });
    expect(u1Key(id).answer).toEqual(expected);
    // The printed columns are ∠1…∠4 against ∠5…∠8: reading straight across a row is never correct.
    for (const pair of expected) expect(pair, `${id}: ${pair} lies on one printed row`).not.toMatch(/∠1 ↔ ∠5|∠2 ↔ ∠6|∠3 ↔ ∠7|∠4 ↔ ∠8/);
  });

  it('U1-P2-B: the example pairs in the key are a corresponding and an alternate pair in the rotated drawing', () => {
    const byLabel = new Map(indexLabelledAngles(u1Figure('U1-P2-B').svg).map(a => [a.label, a]));
    const [corresponding, alternate] = asList(u1Key('U1-P2-B').answer as string[]).map(line => /∠(\d) ו־∠(\d)/.exec(line));
    expect(relationOf(byLabel.get(corresponding![1]!)!, byLabel.get(corresponding![2]!)!)).toBe('corresponding');
    expect(isAlternate(relationOf(byLabel.get(alternate![1]!)!, byLabel.get(alternate![2]!)!))).toBe(true);
  });

  it.each(['U1-P2-C', 'U1-P2-D'])('%s: the angle-type word of line 1 is the relation of the pair marked on the given parallels', id => {
    const drawing = u1Drawing(id);
    expect(drawing.chevrons, `${id}: the lines are marked parallel`).toEqual([0, 1]);
    expect(drawing.angles).toHaveLength(2);
    const word = RELATION_WORD[relationOf(drawing.angles[0]!, drawing.angles[1]!)];
    expect(word, `${id}: the marked pair is corresponding or alternate`).toBeDefined();
    const q = unit1Questions.find(item => item.id === id)!;
    const first = (u1Key(id).answer as string[])[0]!;
    expect(first).toBe(word);
    const theorem = word === 'מתאימות' ? THEOREMS.correspondingDirect.text : THEOREMS.alternateDirect.text;
    expect(q.subparts![0]!.replace(/_+/, first)).toBe(theorem);
  });

  it.each([
    ['U1-P3-A', 'alternate'],
    ['U1-P3-D', 'corresponding'],
  ] as const)('%s: a %s pair on marked parallels (equal) and on visibly non-parallel lines (not equal), as the key says', (id, relation) => {
    const figures = [u1Drawing(id, 0), u1Drawing(id, 1)];
    const parallel = figures.filter(d => d.chevrons.length === 2);
    const skewed = figures.filter(d => d.chevrons.length === 0);
    expect(parallel).toHaveLength(1);
    expect(skewed).toHaveLength(1);
    const gapOf = (d: Drawing) => lineAngleGap(d.parallelDirs[0]!, d.parallelDirs[1]!);
    expect(gapOf(parallel[0]!)).toBeLessThan(1e-6);
    expect(gapOf(skewed[0]!), `${id}: the counterexample lines are visibly not parallel`).toBeGreaterThanOrEqual(4);
    for (const d of figures) {
      expect(d.angles).toHaveLength(2);
      const drawn = relationOf(d.angles[0]!, d.angles[1]!);
      expect(relation === 'alternate' ? isAlternate(drawn) : drawn === relation, `${id}: marked pair is ${relation}`).toBe(true);
    }
    const [p0, p1] = parallel[0]!.angles;
    const [s0, s1] = skewed[0]!.angles;
    expect(Math.abs(p0!.span - p1!.span)).toBeLessThan(1e-6);
    expect(Math.abs(s0!.span - s1!.span), `${id}: the non-parallel pair is visibly unequal`).toBeGreaterThanOrEqual(4);
    const key = u1KeyText(id);
    expect(key).toContain('אינם מקבילים');
    expect(key).toContain(relation === 'alternate' ? THEOREMS.alternateDirect.text : THEOREMS.correspondingDirect.text);
    expect(key).toMatch(relation === 'alternate' ? /אחת מהן גדולה מהשנייה/ : /אינן שוות/);
  });

  it('U1-P3-B: each table row\'s relation and "can we tell they are equal" answer follow the drawn marks', () => {
    const rows = u1Figures.get('U1-P3-B') ?? [];
    expect(rows).toHaveLength(4);
    const key = asList(u1Key('U1-P3-B').answer as string[]);
    rows.forEach(({ svg, props }, index) => {
      const d = readParallelDrawing(svg, props);
      expect(d.angles).toHaveLength(2);
      const word = RELATION_WORD[relationOf(d.angles[0]!, d.angles[1]!)];
      expect(word).toBeDefined();
      const given = d.chevrons.length === 2;
      expect(key[index]).toMatch(new RegExp(`^שורה ${index + 1}: ${word!}; ${given ? 'כן' : 'לא ניתן לקבוע'}`));
    });
  });

  it('U1-P3-C: four disjoint lettered pairs, exactly one of them alternate — the key; the note names every distractor\'s relation', () => {
    const angles = u1Drawing('U1-P3-C').angles;
    expect(angles).toHaveLength(8);
    const where = (a: DrawnAngle) => `${a.vertex}/${a.lineSide}/${a.transSide}`;
    expect(new Set(angles.map(where)).size, 'every drawn angle carries exactly one letter').toBe(8);
    const phrase: Partial<Record<Relation, string>> = {
      corresponding: 'זוויות מתאימות',
      'same-side': 'באותו צד של החותך',
      other: 'בצדדים שונים של החותך',
      'alternate-exterior': 'זוויות מתחלפות (שתיהן מחוץ לישרים',
      alternate: 'זוויות מתחלפות (שתיהן בין הישרים',
    };
    const alternates: string[] = [];
    for (const letter of ['א', 'ב', 'ג', 'ד']) {
      const pair = angles.filter(a => a.label === letter);
      expect(pair.map(a => a.vertex).sort(), `pair ${letter}: one angle at each crossing`).toEqual(['bottom', 'top']);
      const relation = relationOf(pair[0]!, pair[1]!);
      if (isAlternate(relation)) alternates.push(letter);
      expect(phrase[relation], `pair ${letter}: ${relation}`).toBeDefined();
      const note = u1Key('U1-P3-C').note ?? '';
      expect(note).toContain(`${letter} — ${phrase[relation]!}`);
      // What the note says about "between the lines" is what the drawing shows.
      const clause = note.slice(note.indexOf(`${letter} — `)).split('.')[0]!;
      const inside = pair.filter(a => a.interior).length;
      if (clause.includes('שתיהן בין הישרים')) expect(inside, `pair ${letter}`).toBe(2);
      if (clause.includes('שתיהן מחוץ לישרים')) expect(inside, `pair ${letter}`).toBe(0);
      if (clause.includes('אחת בין הישרים ואחת מחוצה להם')) expect(inside, `pair ${letter}`).toBe(1);
    }
    expect(alternates).toHaveLength(1);
    expect(u1Key('U1-P3-C').answer).toBe(`הזוג המסומן ${alternates[0]!}.`);
    expect(unit1Questions.find(q => q.id === 'U1-P3-C')!.choices).toContain(`הזוג המסומן ${alternates[0]!}`);
  });
});
