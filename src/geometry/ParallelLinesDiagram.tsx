import { geometryTokens as T } from '../styles/tokens';
import { useDiagramSize, type DiagramSize } from './diagram-size';
import { layoutFigure, mm, type FigureMark, type FigureSpec } from './engine';
import { Figure, type MarkPresentation } from './primitives';
import { resolveAngleStyle, type AngleRole } from './angle-roles';
import type { Point } from './core';

export type AngleMark = {
  intersection: 'top' | 'bottom' | 'top-secondary' | 'bottom-secondary';
  sector: 0 | 1 | 2 | 3;
  label?: string | undefined;
  value?: string | undefined;
  /** Preferred: the angle's pedagogical role (given / target / marked / auxiliary), styled centrally in angle-roles.ts. */
  role?: AngleRole | undefined;
  /** Explicit styling — only when the task text itself refers to the arc form. Never combined with `role`. */
  tone?: 'primary' | 'secondary' | 'neutral' | undefined;
  arcStyle?: 'single' | 'double' | 'dashed' | undefined;
};

export type ParallelLinesDiagramProps = {
  lineLabels?: [string, string] | undefined;
  transversalLabel?: string | undefined;
  secondaryTransversalLabel?: string | undefined;
  orientationDeg?: number | undefined;
  transversalDeg?: number | undefined;
  secondaryTransversalDeg?: number | undefined;
  showParallelMarks?: boolean | undefined;
  /**
   * Rotates the second (bottom) line by this many degrees about its own
   * centre, so the two lines are genuinely NOT parallel. 0 (the default)
   * keeps the pair parallel and renders exactly as before. A non-zero skew
   * always suppresses the parallel chevrons and the "parallel" wording in the
   * accessible name/description, because the drawing is then a real
   * counterexample: corresponding and alternate angles differ by |skew|.
   */
  secondLineSkewDeg?: number | undefined;
  angleMarks?: AngleMark[] | undefined;
  ariaLabel?: string | undefined;
  /** Size class; by default the one of the enclosing question (see diagram-size.tsx). */
  size?: DiagramSize | undefined;
};

/**
 * Angular clearance (degrees) kept between the skewed bottom line and every
 * transversal, so the skew leaves a clearly visible sector on both sides of
 * each ray (arcs are trimmed only to the edge of the drawn line).
 */
const SKEW_SECTOR_CLEARANCE = 12;
/**
 * Largest allowed skew. The lines then meet at least gap / tan(20°) ≈ 2.7 gaps
 * from the crossing — beyond the drawn ends of the lines (the engine extends a
 * line at most lineOverhangMm.max past its crossings), so a skewed pair visibly
 * converges but never crosses in the drawing.
 */
const MAX_SECOND_LINE_SKEW_DEG = 20;

/**
 * Accessible name/description state only what the drawing actually shows: a pair is called
 * parallel only when parallel marks are drawn; an unmarked pair makes no parallel claim.
 */
type LineRelation = 'parallel' | 'nonParallel' | 'unmarked';
const ARIA_LABEL: Record<LineRelation, string> = {
  parallel: 'שרטוט של שני ישרים מקבילים וישר חותך',
  nonParallel: 'שרטוט של שני ישרים שאינם מקבילים וישר חותך',
  unmarked: 'שרטוט של שני ישרים וישר חותך',
};
const RELATION_DESC: Record<LineRelation, string> = {
  parallel: 'שני ישרים מקבילים, המסומנים בסימני מקבילות, וישר החותך אותם.',
  nonParallel: 'שני ישרים שאינם מקבילים וישר החותך אותם.',
  unmarked: 'שני ישרים וישר החותך אותם; בשרטוט לא מסומן שהישרים מקבילים.',
};

function classForMark(mark: AngleMark) {
  const { tone, arcStyle } = resolveAngleStyle(mark);
  return `angle-mark angle-mark--${tone} angle-mark--${arcStyle}`;
}

/**
 * Start/end directions of angle sector `sector` at one intersection.
 *
 * Sectors are indexed by sorting the rays of the REFERENCE (top) line and the
 * transversal, so index k denotes the same position at every intersection:
 * top sector k and bottom sector k are corresponding angles, top k and
 * bottom (k + 2) % 4 are alternate angles (see relations.ts). `lineSkewDeg`
 * is how far this intersection's own line is rotated from the reference
 * line; the arc is then drawn between that line's ACTUAL rays, so a mark sits
 * exactly on the real angle even when the lines are not parallel.
 */
function sectorAngles(lineDeg: number, transversalDeg: number, sector: AngleMark['sector'], lineSkewDeg = 0) {
  const rays = [
    { base: lineDeg, skew: lineSkewDeg },
    { base: transversalDeg, skew: 0 },
    { base: lineDeg + 180, skew: lineSkewDeg },
    { base: transversalDeg + 180, skew: 0 },
  ]
    .map(ray => ({ base: ((ray.base % 360) + 360) % 360, skew: ray.skew }))
    .sort((a, b) => a.base - b.base);

  const startRay = rays[sector]!;
  const nextRay = rays[(sector + 1) % rays.length]!;
  const next = nextRay.base + (sector === rays.length - 1 ? 360 : 0);
  return { start: startRay.base + startRay.skew, end: next + nextRay.skew };
}

/** Smallest angle (0..90°) between two undirected line directions. */
function lineGapDeg(firstDeg: number, secondDeg: number) {
  const diff = (((firstDeg - secondDeg) % 180) + 180) % 180;
  return Math.min(diff, 180 - diff);
}

function assertSkewKeepsSectorOrder(orientationDeg: number, skewDeg: number, transversals: number[]) {
  if (!Number.isFinite(skewDeg) || Math.abs(skewDeg) > MAX_SECOND_LINE_SKEW_DEG) {
    throw new RangeError(
      `secondLineSkewDeg must be a finite number within ±${MAX_SECOND_LINE_SKEW_DEG}° (received ${skewDeg}).`,
    );
  }
  for (const transversalDeg of transversals) {
    const gap = lineGapDeg(orientationDeg, transversalDeg);
    if (Math.abs(skewDeg) > gap - SKEW_SECTOR_CLEARANCE) {
      throw new RangeError(
        `secondLineSkewDeg=${skewDeg} is too large for a transversal at ${transversalDeg}° ` +
        `(the lines at ${orientationDeg}° leave only ${gap.toFixed(1)}°); ` +
        `the skewed line would cross the transversal's direction and scramble the angle sectors.`,
      );
    }
  }
}

/** Where the secondary transversal crosses the lines, relative to the primary one (in gaps). */
const SECONDARY_OFFSET = 0.613;

export type FigureInput = {
  lineLabels: [string, string];
  transversalLabel: string;
  secondaryTransversalLabel: string;
  orientationDeg: number;
  transversalDeg: number;
  secondaryTransversalDeg: number | undefined;
  secondLineSkewDeg: number;
  showParallelMarks: boolean;
  angleMarks: AngleMark[];
};

const unitVector = (deg: number): Point => ({ x: Math.cos((deg * Math.PI) / 180), y: Math.sin((deg * Math.PI) / 180) });

/**
 * The secondary transversal passes through a point SECONDARY_OFFSET gaps along the lines from
 * the primary one — moved farther out when either of its crossings would come closer than
 * minIntersectionSpacingMm to the primary crossing on the same line (no near-concurrency), or
 * when the two transversals would cross each other near a line or near their drawn ends
 * (they must cross clearly between the lines, or well outside the drawing).
 */
function secondaryAnchor(gap: number, orientationDeg: number, primaryDeg: number, secondaryDeg: number): Point {
  const along = unitVector(orientationDeg);
  const cot = (deg: number) => {
    const angle = ((deg - orientationDeg) * Math.PI) / 180;
    return Math.cos(angle) / Math.sin(angle);
  };
  // Along-line position of a transversal's crossing with the line at normal offset n.
  const crossingAt = (offset: number, deg: number, n: number) => offset + n * cot(deg);
  const minSpacing = mm(T.minIntersectionSpacingMm);
  const clearOfLines = (offset: number) => {
    const slopeGap = cot(secondaryDeg) - cot(primaryDeg);
    if (Math.abs(slopeGap) < 1e-9) return true;
    // Normal offset where the two transversals meet.
    const meet = -offset / slopeGap;
    return Math.abs(meet) <= gap / 2 - mm(4) || Math.abs(meet) >= gap / 2 + mm(T.transversalOverhangMm + 4);
  };
  for (let factor = SECONDARY_OFFSET; factor < SECONDARY_OFFSET + 3; factor += 0.05) {
    const offset = factor * gap;
    const spaced = [-gap / 2, gap / 2].every(n => Math.abs(crossingAt(offset, secondaryDeg, n) - crossingAt(0, primaryDeg, n)) >= minSpacing);
    if (spaced && clearOfLines(offset)) return { x: along.x * offset, y: along.y * offset };
  }
  return { x: along.x * SECONDARY_OFFSET * gap, y: along.y * SECONDARY_OFFSET * gap };
}

/** The figure at a given gap (px) between the two lines, in the engine's terms. */
export function buildFigure(gap: number, input: FigureInput): FigureSpec {
  const { orientationDeg, transversalDeg, secondaryTransversalDeg, secondLineSkewDeg } = input;
  const normal = unitVector(orientationDeg + 90);
  // The top line sits half a gap toward −normal, the bottom line half a gap toward +normal.
  const top: Point = { x: (-normal.x * gap) / 2, y: (-normal.y * gap) / 2 };
  const bottom: Point = { x: (normal.x * gap) / 2, y: (normal.y * gap) / 2 };
  const lines: FigureSpec['lines'] = [
    { kind: 'given', anchor: top, deg: orientationDeg, label: input.lineLabels[0], chevrons: input.showParallelMarks, labelSide: -1 },
    { kind: 'given', anchor: bottom, deg: orientationDeg + secondLineSkewDeg, label: input.lineLabels[1], chevrons: input.showParallelMarks, labelSide: 1 },
    { kind: 'transversal', anchor: { x: 0, y: 0 }, deg: transversalDeg, label: input.transversalLabel, labelSide: 1 },
  ];
  if (secondaryTransversalDeg != null) {
    lines.push({
      kind: 'transversal',
      anchor: secondaryAnchor(gap, orientationDeg, transversalDeg, secondaryTransversalDeg),
      deg: secondaryTransversalDeg,
      label: input.secondaryTransversalLabel,
      labelSide: 1,
    });
  }
  const vertexLines: Record<AngleMark['intersection'], { given: number; transversal: number; skew: number }> = {
    top: { given: 0, transversal: 2, skew: 0 },
    bottom: { given: 1, transversal: 2, skew: secondLineSkewDeg },
    'top-secondary': { given: 0, transversal: 3, skew: 0 },
    'bottom-secondary': { given: 1, transversal: 3, skew: secondLineSkewDeg },
  };
  const marks: FigureMark[] = input.angleMarks.flatMap(mark => {
    const at = vertexLines[mark.intersection];
    const transDeg = at.transversal === 3 ? secondaryTransversalDeg : transversalDeg;
    if (transDeg == null) return [];
    const { start, end } = sectorAngles(orientationDeg, transDeg, mark.sector, at.skew);
    return [{
      given: at.given,
      transversal: at.transversal,
      start,
      end,
      arcStyle: resolveAngleStyle(mark).arcStyle,
      label: mark.label ?? mark.value,
    }];
  });
  return { lines, marks };
}

export function ParallelLinesDiagram({
  lineLabels = ['p', 'q'],
  transversalLabel = 't',
  secondaryTransversalLabel = 's',
  orientationDeg = 0,
  transversalDeg = 62,
  secondaryTransversalDeg,
  showParallelMarks: showParallelMarksProp,
  secondLineSkewDeg = 0,
  angleMarks = [],
  ariaLabel,
  size: sizeProp,
}: ParallelLinesDiagramProps) {
  const size = useDiagramSize(sizeProp);
  const isSkewed = secondLineSkewDeg !== 0;
  if (isSkewed) {
    if (showParallelMarksProp === true) {
      throw new RangeError('ParallelLinesDiagram: parallel marks cannot be drawn on a non-parallel (skewed) pair.');
    }
    assertSkewKeepsSectorOrder(
      orientationDeg,
      secondLineSkewDeg,
      secondaryTransversalDeg == null ? [transversalDeg] : [transversalDeg, secondaryTransversalDeg],
    );
  }
  // Chevrons assert parallelism, so a skewed (non-parallel) pair never gets them.
  const showParallelMarks = (showParallelMarksProp ?? !isSkewed) && !isSkewed;
  const relation: LineRelation = isSkewed ? 'nonParallel' : showParallelMarks ? 'parallel' : 'unmarked';
  const accessibleLabel = ariaLabel ?? ARIA_LABEL[relation];
  const accessibleDesc = `${RELATION_DESC[relation]}${angleMarks.length > 0 ? ' זוויות מסומנות בקשתות.' : ''}`;

  const input: FigureInput = {
    lineLabels,
    transversalLabel,
    secondaryTransversalLabel,
    orientationDeg,
    transversalDeg,
    secondaryTransversalDeg,
    secondLineSkewDeg,
    showParallelMarks,
    angleMarks,
  };
  const layout = layoutFigure(`parallel|${JSON.stringify(input)}`, size, gap => buildFigure(gap, input));

  // One presentation per DRAWN mark (marks at a missing secondary transversal are not drawn).
  const presentations: MarkPresentation[] = angleMarks
    .filter(mark => secondaryTransversalDeg != null || (mark.intersection !== 'top-secondary' && mark.intersection !== 'bottom-secondary'))
    .map(mark => ({
      className: classForMark(mark),
      attributes: { 'data-angle-role': mark.role, 'data-angle-at': mark.intersection, 'data-angle-sector': mark.sector },
    }));

  return (
    <Figure
      layout={layout}
      size={size}
      className="geometry-diagram geometry-diagram--premium"
      ariaLabel={accessibleLabel}
      description={accessibleDesc}
      marks={presentations}
      svgAttributes={{
        'data-line-relation': isSkewed ? 'non-parallel' : undefined,
        'data-second-line-skew': isSkewed ? secondLineSkewDeg : undefined,
      }}
    />
  );
}
