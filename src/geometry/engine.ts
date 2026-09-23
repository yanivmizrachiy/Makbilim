/**
 * The geometry engine: lays out one line diagram at a fixed PHYSICAL scale.
 *
 * One SVG user unit is one CSS px, so stroke widths, label sizes, arc radii and halos (all from
 * `geometryTokens`) print at exactly their stated size in every slot. Only the drawing adapts
 * to its box: the engine searches the largest gap between the lines (the geometry scale) at
 * which the whole figure — lines, arcs, chevrons AND placed labels — fits the diagram's size
 * class, then lengthens the given lines as far as the box allows. The viewBox is the fitted
 * extent of what is drawn, so a figure always fills its box and never overflows it.
 *
 * Everything here is pure and deterministic: the same inputs give byte-identical output.
 */
import { geometryTokens as T, type DiagramSize } from '../styles/tokens';
import { clipSegmentToRect, lineIntersection, normalizeAngle, pointOnRay, type Point, type Rect, type Segment } from './core';
import { LABEL_FONT_ASCENT, LABEL_FONT_DESCENT, shapeLabel, type ShapedLabel } from './label-font';

export const mm = (value: number) => value * T.pxPerMm;
export const pt = (value: number) => value * T.pxPerPt;

export type ArcStyle = 'single' | 'double' | 'dashed';

/** A drawn straight line of the figure (anchor and direction in px; the engine sets its extent). */
export type FigureLine = {
  kind: 'given' | 'transversal';
  anchor: Point;
  deg: number;
  label?: string | undefined;
  chevrons?: boolean | undefined;
  /** Preferred side for the line's label: +1 = toward direction deg + 90°, −1 = the other side. */
  labelSide?: 1 | -1 | undefined;
};

/** An angle mark at the crossing of lines[given] and lines[transversal], sweeping start → end (deg). */
export type FigureMark = {
  given: number;
  transversal: number;
  start: number;
  end: number;
  arcStyle: ArcStyle;
  label?: string | undefined;
};

export type FigureSpec = { lines: FigureLine[]; marks: FigureMark[] };

export type PlacedLabel = {
  kind: 'angle' | 'index' | 'line';
  shaped: ShapedLabel;
  fontPx: number;
  /** Centre of the ink box, and the text anchor point (x centre, y baseline). */
  center: Point;
  x: number;
  y: number;
  /** Ink box (glyph ink plus halo) and em box (what the DOM reports for the text element). */
  ink: Rect;
  em: Rect;
  /** Hairline from the arc to a label that had to sit farther out. */
  leader?: Segment | undefined;
};

export type LaidOutArc = { radius: number; start: number; end: number; d: string };

export type LaidOutMark = {
  mark: FigureMark;
  vertex: Point;
  /** Empty for index (numbering) marks, which carry only their number. */
  arcs: LaidOutArc[];
  index: boolean;
  label?: PlacedLabel | undefined;
};

export type Chevron = { center: Point; deg: number; points: [string, string]; segments: Segment[] };

export type FigureLayout = {
  size: DiagramSize;
  /** Geometry scale: the gap between the lines relative to the size class's nominal gap. */
  scale: number;
  /** Whether every label found a legal spot (false only if even the smallest scale fails). */
  complete: boolean;
  /** Why the layout is not complete (empty when it is). */
  problems: string[];
  segments: Segment[];
  dots: Point[];
  chevrons: Chevron[];
  marks: LaidOutMark[];
  lineLabels: Array<PlacedLabel | null>;
  viewBox: { x: number; y: number; width: number; height: number };
};

// ── Small geometry helpers ─────────────────────────────────────────────────

const unit = (deg: number): Point => ({ x: Math.cos((deg * Math.PI) / 180), y: Math.sin((deg * Math.PI) / 180) });
const add = (p: Point, v: Point, k = 1): Point => ({ x: p.x + v.x * k, y: p.y + v.y * k });
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;
const grow = (rect: Rect, by: number): Rect => ({ left: rect.left - by, top: rect.top - by, right: rect.right + by, bottom: rect.bottom + by });
const overlaps = (a: Rect, b: Rect) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
const hitsSegment = (rect: Rect, segment: Segment) => clipSegmentToRect(segment, rect) !== null;
const dirOf = (from: Point, to: Point) => normalizeAngle((Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI);

function unionRect(rects: Rect[]): Rect {
  return rects.reduce((acc, r) => ({
    left: Math.min(acc.left, r.left), top: Math.min(acc.top, r.top),
    right: Math.max(acc.right, r.right), bottom: Math.max(acc.bottom, r.bottom),
  }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
}

const segmentRect = (s: Segment, pad: number): Rect => ({
  left: Math.min(s.a.x, s.b.x) - pad, top: Math.min(s.a.y, s.b.y) - pad,
  right: Math.max(s.a.x, s.b.x) + pad, bottom: Math.max(s.a.y, s.b.y) + pad,
});

/** Distance from a point to the infinite line through a segment. */
function distanceToLine(p: Point, s: Segment) {
  const dx = s.b.x - s.a.x;
  const dy = s.b.y - s.a.y;
  return Math.abs(dy * (p.x - s.a.x) - dx * (p.y - s.a.y)) / Math.hypot(dx, dy);
}

/** Whether direction `deg` lies in the sweep start → end (end > start), `margin` degrees inside. */
function inSweep(deg: number, start: number, end: number, margin = 0) {
  const offset = normalizeAngle(deg - start);
  return offset >= margin && offset <= end - start - margin;
}

// ── Arcs ──────────────────────────────────────────────────────────────────

/**
 * An arc meets both rays of its angle: its butt ends are trimmed exactly to the edge of the
 * drawn line (half the line stroke), so it touches the line without painting over it.
 */
export function arcTrimDeg(radius: number) {
  return (Math.asin(Math.min(1, mm(T.stroke.lineMm) / 2 / radius)) * 180) / Math.PI;
}

/** Inner arc radius for an angle of `span` degrees: acute angles get a larger arc so their label fits. */
export function arcRadiusFor(span: number) {
  return mm(T.arc.radiusMm + (span < T.arc.acuteBelowDeg ? T.arc.acuteBoostMm : 0));
}

const fmt = (value: number) => (Math.round(value * 1000) / 1000).toString();

function arcPathD(center: Point, radius: number, start: number, end: number) {
  const a = pointOnRay(center, start, radius);
  const b = pointOnRay(center, end, radius);
  const large = end - start > 180 ? 1 : 0;
  return `M ${fmt(a.x)} ${fmt(a.y)} A ${fmt(radius)} ${fmt(radius)} 0 ${large} 1 ${fmt(b.x)} ${fmt(b.y)}`;
}

/** Polyline through an arc, used as an obstacle for label placement. */
function arcSegments(center: Point, radius: number, start: number, end: number): Segment[] {
  const steps = Math.max(2, Math.ceil((end - start) / 12));
  const points = Array.from({ length: steps + 1 }, (_, i) => pointOnRay(center, start + ((end - start) * i) / steps, radius));
  return points.slice(1).map((b, i) => ({ a: points[i]!, b }));
}

// ── Labels ────────────────────────────────────────────────────────────────

/** Italic overhang allowance on each side of a label's advance box (em). */
const ITALIC_ALLOWANCE_EM = 0.06;

type LabelBoxes = { ink: Rect; em: Rect; x: number; y: number };

function labelBoxes(shaped: ShapedLabel, fontPx: number, center: Point): LabelBoxes {
  const halfWidth = (shaped.width / 2 + ITALIC_ALLOWANCE_EM) * fontPx;
  const halo = mm(T.label.haloMm) / 2;
  // Vertically the INK is centred on `center`; the baseline follows from the glyph extent.
  const baseline = center.y + ((shaped.yMax + shaped.yMin) / 2) * fontPx;
  const ink: Rect = {
    left: center.x - halfWidth - halo,
    right: center.x + halfWidth + halo,
    top: baseline - shaped.yMax * fontPx - halo,
    bottom: baseline - shaped.yMin * fontPx + halo,
  };
  const em: Rect = {
    left: center.x - (shaped.width / 2) * fontPx,
    right: center.x + (shaped.width / 2) * fontPx,
    top: baseline - LABEL_FONT_ASCENT * fontPx,
    bottom: baseline + LABEL_FONT_DESCENT * fontPx,
  };
  return { ink, em, x: center.x, y: baseline };
}

/** Everything a new label must keep clear of. */
type Obstacles = { segments: Segment[]; labels: Rect[] };

/**
 * The box a figure must fit: the extent drawn so far may grow in any direction as long as it
 * stays within width × height (so a figure with all its labels on one side is not penalised).
 */
type Frame = { extent: Rect; width: number; height: number };

function admits(frame: Frame, rect: Rect) {
  const u = unionRect([frame.extent, rect]);
  return u.right - u.left <= frame.width + 1e-6 && u.bottom - u.top <= frame.height + 1e-6;
}

/** A label spot is legal when its ink clears every drawn line / arc / chevron and every other label. */
function isClear(boxes: LabelBoxes, obstacles: Obstacles, frame: Frame) {
  if (!admits(frame, unionRect([boxes.ink, boxes.em]))) return false;
  const spacing = grow(unionRect([boxes.ink, boxes.em]), mm(T.placement.labelGapMm) / 2);
  if (obstacles.labels.some(other => overlaps(spacing, other))) return false;
  const clear = grow(boxes.ink, mm(T.placement.lineClearanceMm) + mm(T.stroke.lineMm) / 2);
  for (const segment of obstacles.segments) {
    if (!overlaps(clear, segmentRect(segment, 0))) continue;
    if (hitsSegment(clear, segment)) return false;
  }
  return true;
}

const spacingRect = (label: PlacedLabel) => grow(unionRect([label.ink, label.em]), mm(T.placement.labelGapMm) / 2);

/**
 * Places an angle's label in its own sector: on (or near) the bisector, just outside the outer
 * arc, never on a line or arc, with its whole ink box inside the angle. If no spot within
 * `maxBeyondArcMm` of the arc is free, the label moves farther out (still inside the sector)
 * and gets a hairline leader from the arc. `forced` marks a last-resort spot that breaks a rule;
 * the layout then counts as not fitting, so the engine picks a scale where it does fit.
 */
function placeAngleLabel(
  vertex: Point,
  start: number,
  end: number,
  outerRadius: number,
  shaped: ShapedLabel,
  kind: 'angle' | 'index',
  obstacles: Obstacles,
  frame: Frame,
  otherVertices: Point[],
): { label: PlacedLabel; forced: boolean } {
  const fontPx = pt(kind === 'index' ? T.label.indexPt : T.label.anglePt);
  const span = end - start;
  const bisector = start + span / 2;
  const reach = Math.max(0, span / 2 - T.placement.sectorMarginDeg);
  const offsets = [0];
  for (let off = 4; off <= reach; off += 4) offsets.push(off, -off);
  const probe = labelBoxes(shaped, fontPx, { x: 0, y: 0 });
  const halfW = (probe.ink.right - probe.ink.left) / 2;
  const halfH = (probe.ink.bottom - probe.ink.top) / 2;
  const gap = kind === 'index' ? mm(0.3) : mm(T.placement.gapFromArcMm);
  const near = mm(T.placement.maxBeyondArcMm);
  const far = mm(T.placement.leaderReachMm);
  const stepPx = mm(0.4);

  type Candidate = { center: Point; score: number; leader: boolean; direction: number; extra: number };
  const candidates: Candidate[] = [];
  for (const off of offsets) {
    const direction = bisector + off;
    const u = unit(direction);
    const support = Math.abs(u.x) * halfW + Math.abs(u.y) * halfH;
    const first = outerRadius + gap + support;
    for (let extra = 0; extra <= far; extra += stepPx) {
      const leader = extra > near;
      candidates.push({
        center: add(vertex, u, first + extra),
        score: extra / mm(1) + Math.abs(off) * 0.09 + (leader ? 50 : 0),
        leader,
        direction,
        extra,
      });
    }
  }
  candidates.sort((a, b) => a.score - b.score);

  const build = (candidate: Candidate, leader: Segment | undefined): PlacedLabel => {
    const boxes = labelBoxes(shaped, fontPx, candidate.center);
    return { kind, shaped, fontPx, center: candidate.center, x: boxes.x, y: boxes.y, ink: boxes.ink, em: boxes.em, leader };
  };
  const leaderFor = (candidate: Candidate): Segment => {
    const u = unit(candidate.direction);
    const support = Math.abs(u.x) * halfW + Math.abs(u.y) * halfH;
    const distance = Math.hypot(candidate.center.x - vertex.x, candidate.center.y - vertex.y);
    return {
      a: pointOnRay(vertex, candidate.direction, outerRadius + mm(0.35)),
      b: pointOnRay(vertex, candidate.direction, distance - support - mm(0.3)),
    };
  };

  // Preferred: the whole label inside its angle (near the arc, else with a leader). Otherwise
  // (a long expression in a narrow angle): its centre well inside the angle and nearer to this
  // vertex than to any other crossing, clear of every line — beyond a line's drawn end if need be.
  const centreInside = (candidate: Candidate) =>
    inSweep(dirOf(vertex, candidate.center), start, end, Math.min(T.placement.sectorMarginDeg, span / 4));
  const ownVertex = (candidate: Candidate) => {
    const own = Math.hypot(candidate.center.x - vertex.x, candidate.center.y - vertex.y);
    return otherVertices.every(other => Math.hypot(candidate.center.x - other.x, candidate.center.y - other.y) > own);
  };
  for (const wholeInside of [true, false]) {
    for (const candidate of candidates) {
      const boxes = labelBoxes(shaped, fontPx, candidate.center);
      if (wholeInside) {
        const corners = [
          { x: boxes.ink.left, y: boxes.ink.top }, { x: boxes.ink.right, y: boxes.ink.top },
          { x: boxes.ink.left, y: boxes.ink.bottom }, { x: boxes.ink.right, y: boxes.ink.bottom },
        ];
        if (!corners.every(corner => inSweep(dirOf(vertex, corner), start, end))) continue;
      } else if (!centreInside(candidate) || !ownVertex(candidate)) {
        continue;
      }
      let leader: Segment | undefined;
      if (candidate.leader) {
        leader = leaderFor(candidate);
        const drawn = leader;
        if (obstacles.segments.some(segment => segmentsCross(drawn, segment))) continue;
        if (obstacles.labels.some(other => hitsSegment(other, drawn))) continue;
      }
      if (!isClear(boxes, obstacles, frame)) continue;
      return { label: build(candidate, leader), forced: false };
    }
  }
  const first = candidates[0]!;
  return { label: build(first, undefined), forced: true };
}

function segmentsCross(p: Segment, q: Segment) {
  const d = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const d1 = d(q.a, q.b, p.a);
  const d2 = d(q.a, q.b, p.b);
  const d3 = d(p.a, p.b, q.a);
  const d4 = d(p.a, p.b, q.b);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/**
 * Places a line's name just beside one end of the line (its preferred end and side first),
 * clear of every line, arc, chevron and label, and nearer to its own line than to any other.
 */
function placeLineLabel(
  line: Segment,
  preferredEnd: 'a' | 'b',
  preferredSide: 1 | -1,
  maxBack: number,
  shaped: ShapedLabel,
  allLines: Segment[],
  obstacles: Obstacles,
  frame: Frame,
): { label: PlacedLabel; rank: number } | null {
  const fontPx = pt(T.label.linePt);
  const probe = labelBoxes(shaped, fontPx, { x: 0, y: 0 });
  const halfW = (probe.ink.right - probe.ink.left) / 2;
  const halfH = (probe.ink.bottom - probe.ink.top) / 2;
  const length = Math.hypot(line.b.x - line.a.x, line.b.y - line.a.y);
  const dir = { x: (line.b.x - line.a.x) / length, y: (line.b.y - line.a.y) / length };
  const normal = { x: -dir.y, y: dir.x };
  const clearance = mm(T.placement.lineClearanceMm) + mm(T.stroke.lineMm) / 2;
  const ends: Array<{ end: Point; inward: number }> = preferredEnd === 'b'
    ? [{ end: line.b, inward: -1 }, { end: line.a, inward: 1 }]
    : [{ end: line.a, inward: 1 }, { end: line.b, inward: -1 }];
  const own = allLines.find(other => other === line);

  // Candidates by preference: the line's far end first; on each end the outer side first, as
  // close to the end as the free stretch allows; in line past the end last. The rank returned
  // is that (end, side) bucket, so a label moving along its bucket is not a worse placement.
  for (const [endIndex, { end, inward }] of ends.entries()) {
    const alongSupport = Math.abs(dir.x) * halfW + Math.abs(dir.y) * halfH;
    const normalSupport = Math.abs(normal.x) * halfW + Math.abs(normal.y) * halfH;
    const positions: Array<{ center: Point; rank: number }> = [];
    // Only beside the line's free end: never back between its crossings.
    const backs = [0.3, 1.2, 2.4, 3.8, 5.4, 7.2, 9.2, 11.5].filter(back => mm(back) <= maxBack);
    for (const [sideIndex, side] of [preferredSide, -preferredSide].entries()) {
      for (const back of backs.length > 0 ? backs : [0.3]) {
        for (const extraOffset of [0.15, 0.9, 1.8]) {
          const alongPoint = add(end, dir, inward * (mm(back) + alongSupport * 0.6));
          positions.push({
            center: add(alongPoint, normal, side * (normalSupport + clearance + mm(extraOffset))),
            rank: endIndex * 3 + sideIndex,
          });
        }
      }
    }
    positions.push({ center: add(end, dir, -inward * (alongSupport + mm(1.2))), rank: endIndex * 3 + 2 });
    for (const { center, rank } of positions) {
      const boxes = labelBoxes(shaped, fontPx, center);
      if (!isClear(boxes, obstacles, frame)) continue;
      const ownDistance = own ? distanceToLine(center, own) : 0;
      const ambiguous = allLines.some(other => other !== line && distanceToLine(center, other) < ownDistance + mm(1.5) && distanceToSegment(center, other) < ownDistance + mm(4));
      if (ambiguous) continue;
      return { label: { kind: 'line', shaped, fontPx, center, x: boxes.x, y: boxes.y, ink: boxes.ink, em: boxes.em }, rank };
    }
  }
  return null;
}

function distanceToSegment(p: Point, s: Segment) {
  const dx = s.b.x - s.a.x;
  const dy = s.b.y - s.a.y;
  const t = Math.max(0, Math.min(1, ((p.x - s.a.x) * dx + (p.y - s.a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - (s.a.x + t * dx), p.y - (s.a.y + t * dy));
}

// ── Chevrons ──────────────────────────────────────────────────────────────

function chevronAt(center: Point, deg: number): Chevron {
  const L = mm(T.chevron.lengthMm);
  const h = mm(T.chevron.halfHeightMm);
  const pitch = mm(T.chevron.pitchMm);
  const tips = [-pitch / 2 + L / 2, pitch / 2 + L / 2];
  const local = tips.map(tip => [{ x: tip - L, y: -h }, { x: tip, y: 0 }, { x: tip - L, y: h }]);
  const u = unit(deg);
  const n = { x: -u.y, y: u.x };
  const toGlobal = (p: Point): Point => ({ x: center.x + u.x * p.x + n.x * p.y, y: center.y + u.y * p.x + n.y * p.y });
  const segments = local.flatMap(points => {
    const g = points.map(toGlobal);
    return [{ a: g[0]!, b: g[1]! }, { a: g[1]!, b: g[2]! }];
  });
  const points = local.map(points => points.map(p => `${fmt(p.x)},${fmt(p.y)}`).join(' ')) as [string, string];
  return { center, deg, points, segments };
}

// ── Layout ────────────────────────────────────────────────────────────────

type Attempt = { layout: FigureLayout; fits: boolean; ranks: number[]; leaders: number; problems: string[] };

function vertexOf(lines: FigureLine[], i: number, j: number): Point | null {
  const a = lines[i]!;
  const b = lines[j]!;
  return lineIntersection(
    { a: a.anchor, b: add(a.anchor, unit(a.deg), 100) },
    { a: b.anchor, b: add(b.anchor, unit(b.deg), 100) },
  );
}

/** Marks whose label is a bare number and that fill all four angles at a crossing: numbering, no arcs. */
function indexMarks(marks: FigureMark[]): Set<number> {
  const byVertex = new Map<string, number[]>();
  marks.forEach((mark, index) => {
    const key = `${mark.given}:${mark.transversal}`;
    byVertex.set(key, [...(byVertex.get(key) ?? []), index]);
  });
  const result = new Set<number>();
  for (const indices of byVertex.values()) {
    const all = indices.map(i => marks[i]!);
    const directions = new Set(all.map(m => Math.round(normalizeAngle(m.start + (m.end - m.start) / 2))));
    if (directions.size === 4 && all.every(m => m.label !== undefined && /^\d+$/.test(m.label) && m.arcStyle === 'single')) {
      indices.forEach(i => result.add(i));
    }
  }
  return result;
}

/**
 * A line's name goes on the side away from the rest of the figure (above the upper line, below
 * the lower one); a line through the middle takes the upper (or, when steep, the right) side.
 */
function preferredSide(line: FigureLine): 1 | -1 {
  const normal = unit(line.deg + 90);
  const outward = dot(normal, line.anchor);
  if (Math.abs(outward) > 1e-6) return outward > 0 ? 1 : -1;
  const up = Math.abs(normal.y) >= Math.abs(normal.x) ? -normal.y : normal.x;
  return up > 0 ? 1 : -1;
}

/**
 * One layout at a fixed gap and line overhang. In a `quick` attempt (used while searching) the
 * engine stops at the first problem: such a layout is only kept if it has none.
 */
function attempt(spec: FigureSpec, size: DiagramSize, gap: number, requestedOverhang: number, nominal: number, quick = false): Attempt {
  const box = T.size[size];
  const { lines, marks } = spec;
  const numbering = indexMarks(marks);

  // Crossings of every given line with every transversal (transversal by transversal, so the
  // dots read top, bottom, top-secondary, bottom-secondary).
  const crossings: Array<{ given: number; transversal: number; point: Point }> = [];
  lines.forEach((other, j) => {
    if (other.kind !== 'transversal') return;
    lines.forEach((line, i) => {
      if (line.kind !== 'given') return;
      const point = vertexOf(lines, i, j);
      if (point) crossings.push({ given: i, transversal: j, point });
    });
  });

  // Largest arc radius drawn at each crossing (a transversal must reach past it).
  const arcReach = new Map<string, number>();
  marks.forEach((mark, index) => {
    if (numbering.has(index)) return;
    const r = arcRadiusFor(mark.end - mark.start) + (mark.arcStyle === 'double' ? mm(T.arc.doubleGapMm) : 0);
    const key = `${mark.given}:${mark.transversal}`;
    arcReach.set(key, Math.max(arcReach.get(key) ?? 0, r));
  });

  /** Radius of the widest arc at a crossing that borders the ray in direction `deg` (0 if none). */
  const reachToward = (given: number, transversal: number, deg: number) => Math.max(0, ...marks
    .filter((mark, index) => !numbering.has(index) && mark.given === given && mark.transversal === transversal)
    .filter(mark => [mark.start, mark.end].some(edge => Math.abs(normalizeAngle(edge - deg + 180) - 180) < 0.5))
    .map(mark => arcRadiusFor(mark.end - mark.start) + (mark.arcStyle === 'double' ? mm(T.arc.doubleGapMm) : 0)));
  const chevronSpan = mm(T.chevron.lengthMm + T.chevron.pitchMm);

  // Given lines end on a common vertical (flat lines) or horizontal (steep lines): the ends
  // line up with the frame, as in a drawn figure, and no line is longer than it needs to be.
  const origin = { x: 0, y: 0 };
  const firstGiven = lines.find(line => line.kind === 'given');
  const reference = unit(firstGiven?.deg ?? 0);
  const flat = Math.abs(reference.x) >= Math.abs(reference.y);
  const axis = (p: Point) => (flat ? p.x : p.y);
  const axisPerLength = Math.abs(axis(reference));
  /** Direction of a line that runs toward the window start (decreasing axis). */
  const towardStart = (line: FigureLine) => (axis(unit(line.deg)) > 0 ? line.deg + 180 : line.deg);
  const givenAxis = crossings.map(c => axis(c.point));

  // Chevrons sit before the first crossing, clear of any arc on that side, lined up across the
  // lines; each line runs on past them so they never read as an arrowhead at its end.
  const chevronLines = lines.map((line, index) => ({ line, index })).filter(({ line }) => line.kind === 'given' && line.chevrons);
  const chevronAxis = chevronLines.length === 0 ? null : Math.min(...chevronLines.flatMap(({ line, index }) =>
    crossings.filter(c => c.given === index).map(c => axis(c.point)
      - (Math.max(reachToward(index, c.transversal, towardStart(line)), mm(T.dotRadiusMm)) + mm(T.chevron.clearFromArcMm) + chevronSpan / 2) * axisPerLength)));

  // Each end of the lines runs at least `requestedOverhang` past the outermost crossing, and far
  // enough past every arc on that side to leave room for a line name beside it.
  const labelRoom = mm(3.5);
  const windowStart = Math.min(
    Math.min(...givenAxis) - requestedOverhang * axisPerLength,
    ...(chevronAxis === null ? [] : [chevronAxis - (chevronSpan / 2 + mm(T.chevron.runOnMm)) * axisPerLength]),
    ...crossings.map(c => axis(c.point) - (reachToward(c.given, c.transversal, towardStart(lines[c.given]!)) + labelRoom) * axisPerLength),
  );
  const windowEnd = Math.max(
    Math.max(...givenAxis) + requestedOverhang * axisPerLength,
    ...crossings.map(c => axis(c.point) + (reachToward(c.given, c.transversal, towardStart(lines[c.given]!) + 180) + labelRoom) * axisPerLength),
  );
  /** Point on a line where the axis coordinate equals `value`. */
  const atAxis = (line: FigureLine, value: number) => {
    const u = unit(line.deg);
    return add(line.anchor, u, (value - axis(line.anchor)) / axis(u));
  };

  // How far each line runs on past its last crossing's arcs: where its name may sit.
  const freeEnd: number[] = [];
  const preferredEnds: Array<'a' | 'b'> = [];
  const segments: Segment[] = lines.map((line, index) => {
    const u = unit(line.deg);
    if (line.kind === 'given') {
      const ends = [atAxis(line, windowStart), atAxis(line, windowEnd)].sort((p, q) => dot(p, u) - dot(q, u)) as [Point, Point];
      const own = crossings.filter(c => c.given === index);
      const params = own.map(c => dot(c.point, u));
      const reachForward = Math.max(0, ...own.map(c => reachToward(index, c.transversal, line.deg)));
      const reachBackward = Math.max(0, ...own.map(c => reachToward(index, c.transversal, line.deg + 180)));
      freeEnd[index] = Math.min(
        dot(ends[1], u) - Math.max(...params) - reachForward,
        Math.min(...params) - dot(ends[0], u) - reachBackward,
      ) - mm(1.5);
      // The name goes at the end away from the chevrons (which sit at the window start).
      preferredEnds[index] = axis(ends[1]) >= axis(ends[0]) ? 'b' : 'a';
      return { a: ends[0], b: ends[1] };
    }
    const foot = add(line.anchor, u, -dot(line.anchor, u));
    const own = crossings.filter(c => c.transversal === index);
    const params = own.map(c => dot({ x: c.point.x - foot.x, y: c.point.y - foot.y }, u));
    const reaches = own.map(c => arcReach.get(`${c.given}:${index}`) ?? 0);
    const overhang = Math.max(mm(6), Math.min(mm(T.transversalOverhangMm), 0.42 * gap), ...reaches.map(r => r + mm(1.4)));
    freeEnd[index] = overhang - Math.max(0, ...reaches) - mm(1);
    // A transversal's name goes at its lower (or, when it is flat, its right-hand) end first.
    preferredEnds[index] = u.x + u.y >= 0 ? 'b' : 'a';
    return { a: add(foot, u, Math.min(...params) - overhang), b: add(foot, u, Math.max(...params) + overhang) };
  });

  // Arcs.
  const laidMarks: LaidOutMark[] = marks.map((mark, index) => {
    const vertex = vertexOf(lines, mark.given, mark.transversal) ?? origin;
    if (numbering.has(index)) return { mark, vertex, arcs: [], index: true };
    const inner = arcRadiusFor(mark.end - mark.start);
    const radii = mark.arcStyle === 'double' ? [inner, inner + mm(T.arc.doubleGapMm)] : [inner];
    const arcs = radii.map(radius => {
      const trim = arcTrimDeg(radius);
      const start = mark.start + trim;
      const end = mark.end - trim;
      return { radius, start, end, d: arcPathD(vertex, radius, start, end) };
    });
    return { mark, vertex, arcs, index: false };
  });
  const arcObstacles = laidMarks.flatMap(m => m.arcs.flatMap(arc => arcSegments(m.vertex, arc.radius, arc.start, arc.end)));

  const chevrons: Chevron[] = chevronAxis === null ? [] : chevronLines.map(({ line }) => chevronAt(atAxis(line, chevronAxis), line.deg));

  const dots = crossings.map(c => c.point);

  // The box the figure must fit, centred on the drawing's core.
  const strokePad = mm(T.stroke.lineMm) / 2;
  const core = unionRect([
    ...segments.map(s => segmentRect(s, strokePad)),
    ...arcObstacles.map(s => segmentRect(s, mm(T.stroke.arcMm) / 2)),
    ...chevrons.flatMap(c => c.segments.map(s => segmentRect(s, mm(T.stroke.chevronMm) / 2))),
  ]);
  const inset = mm(T.insetMm);
  const width = mm(box.maxWidthMm) - 2 * inset;
  const height = mm(box.heightMm) - 2 * inset;
  const frame: Frame = { extent: core, width, height };
  const problems: string[] = [];
  if (core.right - core.left > width || core.bottom - core.top > height) problems.push('drawing larger than its box');

  const obstacles: Obstacles = {
    segments: [...segments, ...arcObstacles, ...chevrons.flatMap(c => c.segments)],
    labels: [],
  };

  // Angle labels first (they are tied to their arc), then line names.
  for (const laid of laidMarks) {
    const text = laid.mark.label;
    if (!text) continue;
    if (quick && problems.length > 0) break;
    const outer = laid.index ? mm(1.6) : Math.max(...laid.arcs.map(arc => arc.radius)) + mm(T.stroke.arcMm) / 2;
    const { label, forced } = placeAngleLabel(laid.vertex, laid.mark.start, laid.mark.end, outer, shapeLabel(text), laid.index ? 'index' : 'angle', obstacles, frame, dots.filter(dot => Math.hypot(dot.x - laid.vertex.x, dot.y - laid.vertex.y) > 1e-6));
    if (forced) problems.push(`angle label "${text}" has no legal spot`);
    laid.label = label;
    obstacles.labels.push(spacingRect(label));
    if (label.leader) obstacles.segments.push(label.leader);
    frame.extent = unionRect([frame.extent, label.ink, label.em]);
  }

  const lineLabels: Array<PlacedLabel | null> = lines.map(() => null);
  const ranks: number[] = [];
  const order = lines.map((line, index) => ({ line, index })).sort((a, b) => (a.line.kind === b.line.kind ? a.index - b.index : a.line.kind === 'given' ? -1 : 1));
  for (const { line, index } of order) {
    if (!line.label) continue;
    if (quick && problems.length > 0) break;
    const segment = segments[index]!;
    const placed = placeLineLabel(
      segment,
      preferredEnds[index] ?? 'b',
      line.labelSide ?? preferredSide(line),
      freeEnd[index] ?? 0,
      shapeLabel(line.label),
      segments,
      obstacles,
      frame,
    );
    if (!placed) {
      problems.push(`line label "${line.label}" has no legal spot`);
      ranks.push(Infinity);
      continue;
    }
    ranks.push(placed.rank);
    lineLabels[index] = placed.label;
    obstacles.labels.push(spacingRect(placed.label));
    frame.extent = unionRect([frame.extent, placed.label.ink, placed.label.em]);
  }

  const inkRects = [
    core,
    ...laidMarks.flatMap(m => (m.label ? [m.label.ink, m.label.em] : [])),
    ...laidMarks.flatMap(m => (m.label?.leader ? [segmentRect(m.label.leader, mm(T.stroke.leaderMm))] : [])),
    ...lineLabels.flatMap(l => (l ? [l.ink, l.em] : [])),
  ];
  const extent = grow(unionRect(inkRects), inset);
  const fits = problems.length === 0;
  return {
    fits,
    problems,
    ranks,
    leaders: laidMarks.filter(m => m.label?.leader).length,
    layout: {
      size,
      scale: gap / nominal,
      complete: fits,
      problems,
      segments,
      dots,
      chevrons,
      marks: laidMarks,
      lineLabels,
      viewBox: { x: extent.left, y: extent.top, width: extent.right - extent.left, height: extent.bottom - extent.top },
    },
  };
}

/** One layout at a fixed gap and line overhang (px) — for diagnostics and tests. */
export function probeLayout(spec: FigureSpec, size: DiagramSize, gap: number, lineOverhang: number, nominalFactor = 1) {
  return attempt(spec, size, gap, lineOverhang, mm(T.size[size].nominalGapMm) * nominalFactor);
}

const cache = new Map<string, FigureLayout>();

/**
 * Lays out a figure in its size class. `build(gap)` returns the figure for a given gap between
 * the lines (px); the engine picks the largest gap (geometry scale ≤ the class maxScale) whose
 * figure fits the box with every label placed, then lengthens the given lines as far as fits.
 */
export function layoutFigure(
  key: string,
  size: DiagramSize,
  build: (gap: number) => FigureSpec,
  /** Nominal gap relative to the size class's (a three-line figure spans two gaps: 0.6). */
  nominalFactor = 1,
): FigureLayout {
  const cacheKey = `${size}|${key}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const nominal = mm(T.size[size].nominalGapMm) * nominalFactor;
  const high = nominal * T.size[size].maxScale;
  const minOverhang = mm(T.lineOverhangMm.min);
  const maxOverhang = mm(T.lineOverhangMm.max);
  const tryAt = (gap: number, overhang: number, quick = true) => attempt(build(gap), size, gap, overhang, nominal, quick);

  // 1. Scan the geometry scale from the largest down (fit is not monotonic: a bigger figure
  //    can open room for a long label between steep lines). Among the scales that fit, take the
  //    largest, where each leader line costs a quarter of scale; then refine upward by bisection.
  const steps = 14;
  const lowest = nominal * 0.6;
  const grid = Array.from({ length: steps + 1 }, (_, i) => high - ((high - lowest) * i) / steps);
  const scanned = grid.map(gap => ({ gap, result: tryAt(gap, minOverhang) }));
  const fitting = scanned.filter(entry => entry.result.fits);
  // Nothing fits: the smallest figure, fully laid out (every label drawn, flagged incomplete).
  let best: Attempt = fitting.length > 0 ? scanned[scanned.length - 1]!.result : tryAt(lowest, minOverhang, false);
  if (fitting.length > 0) {
    const merit = (entry: { gap: number; result: Attempt }) => entry.gap / nominal - 0.25 * entry.result.leaders;
    const chosen = fitting.reduce((winner, entry) => (merit(entry) > merit(winner) + 1e-9 ? entry : winner));
    best = chosen.result;
    const acceptable = (result: Attempt) => result.fits && result.leaders <= chosen.result.leaders;
    let lo = chosen.gap;
    let hi = Math.min(high, chosen.gap + (high - lowest) / steps);
    if (hi > lo) {
      for (let i = 0; i < 6; i += 1) {
        const mid = (lo + hi) / 2;
        const result = tryAt(mid, minOverhang);
        if (acceptable(result)) {
          lo = mid;
          best = result;
        } else {
          hi = mid;
        }
      }
    }

    // 2. Lengthen the given lines as far as the box allows, as long as no label moves to a
    //    less preferred spot than it had with the shortest lines.
    const gap = best.layout.scale * nominal;
    const base = best;
    const noWorse = (result: Attempt) =>
      result.fits && result.leaders <= base.leaders && result.ranks.every((rank, i) => rank <= (base.ranks[i] ?? Infinity));
    const longest = tryAt(gap, maxOverhang);
    if (noWorse(longest)) {
      best = longest;
    } else {
      let lo = minOverhang;
      let hi = maxOverhang;
      for (let i = 0; i < 7; i += 1) {
        const mid = (lo + hi) / 2;
        const result = tryAt(gap, mid);
        if (noWorse(result)) {
          lo = mid;
          best = result;
        } else {
          hi = mid;
        }
      }
    }
  }

  cache.set(cacheKey, best.layout);
  return best.layout;
}
