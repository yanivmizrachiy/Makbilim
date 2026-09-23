import {
  arcPath,
  chooseRadialLabelPoint,
  clampLabelPoint,
  estimateLabelRect,
  LABEL_INK_BOX,
  lineIntersection,
  offsetPoint,
  pointOnRay,
  rectsOverlap,
  segmentNearRect,
  segmentThrough,
  type Point,
  type Rect,
} from './core';
import { resolveAngleStyle, type AngleRole } from './angle-roles';

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
};

const W = 480;
const H = 320;
const CENTER: Point = { x: W / 2, y: H / 2 };
const PARALLEL_DISTANCE = 62;
const PARALLEL_LENGTH = 300;
const TRANSVERSAL_LENGTH = 330;
/**
 * Angular clearance (degrees) kept between the skewed bottom line and every
 * transversal. Sector arcs are trimmed by 5° on each side, so the skew must
 * leave a visible sector on both sides of each ray after trimming.
 */
const SKEW_SECTOR_CLEARANCE = 12;
/**
 * Largest allowed skew. The lines then meet at least 2 * PARALLEL_DISTANCE /
 * sin(20°) ≈ 363 units from the bottom line's centre, hence ≥ 363 − 62 ≈ 301
 * units from the viewBox centre — beyond the 480×320 viewBox's half-diagonal
 * (≈ 288). A skewed pair visibly converges but never crosses in the drawing.
 */
const MAX_SECOND_LINE_SKEW_DEG = 20;

/** Candidate spots for a line label: distance along the line from its centre, and off the line. */
const LINE_LABEL_ALONG = [142, 128, 114, -142, -128, -114];
const LINE_LABEL_OFFSET = [18, 24];

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

function angleSectorPath(center: Point, radius: number, startDeg: number, endDeg: number) {
  const start = pointOnRay(center, startDeg, radius);
  const end = pointOnRay(center, endDeg, radius);
  const delta = Math.max(0, endDeg - startDeg);
  const largeArc = delta > 180 ? 1 : 0;
  return [
    `M ${center.x.toFixed(2)} ${center.y.toFixed(2)}`,
    `L ${start.x.toFixed(2)} ${start.y.toFixed(2)}`,
    `A ${radius} ${radius} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

function ParallelMark({ center, lineDeg }: { center: Point; lineDeg: number }) {
  return (
    <g
      className="parallel-mark parallel-mark--chevrons"
      transform={`translate(${center.x.toFixed(2)} ${center.y.toFixed(2)}) rotate(${lineDeg})`}
      aria-hidden="true"
    >
      <polyline points="-10,-6 -2,0 -10,6" />
      <polyline points="2,-6 10,0 2,6" />
    </g>
  );
}

function labelPoint(center: Point, lineDeg: number, along: number, normal: number): Point {
  return offsetPoint(pointOnRay(center, lineDeg, along), lineDeg, normal);
}

function labelRadiusFor(text: string, start: number, end: number) {
  const span = Math.max(12, Math.min(170, end - start));
  const textAllowance = Math.min(14, Math.max(0, text.length - 2) * 2.6);
  const spanAllowance = span < 45 ? 12 : span < 70 ? 7 : 0;
  return 48 + textAllowance + spanAllowance;
}

function LabelPlate({ point, label }: { point: Point; label: string }) {
  const width = Math.max(28, Math.min(82, 17 + label.length * 10.4));
  const height = 27;
  return (
    <g className="angle-label-plate" aria-hidden="true">
      <rect
        x={point.x - width / 2}
        y={point.y - height / 2}
        width={width}
        height={height}
        rx={7}
        ry={7}
      />
    </g>
  );
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
}: ParallelLinesDiagramProps) {
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
  const showParallelMarks = showParallelMarksProp ?? !isSkewed;
  const relation: LineRelation = isSkewed ? 'nonParallel' : showParallelMarks ? 'parallel' : 'unmarked';
  const accessibleLabel = ariaLabel ?? ARIA_LABEL[relation];
  const accessibleDesc = `${RELATION_DESC[relation]}${angleMarks.length > 0 ? ' זוויות מסומנות בקשתות.' : ''}`;
  const bottomLineDeg = orientationDeg + secondLineSkewDeg;

  const topCenter = offsetPoint(CENTER, orientationDeg, -PARALLEL_DISTANCE);
  const bottomCenter = offsetPoint(CENTER, orientationDeg, PARALLEL_DISTANCE);
  const top = segmentThrough(topCenter, PARALLEL_LENGTH, orientationDeg);
  // The bottom line pivots about its own centre; with no skew it is parallel.
  const bottom = segmentThrough(bottomCenter, PARALLEL_LENGTH, bottomLineDeg);

  const primary = segmentThrough(CENTER, TRANSVERSAL_LENGTH, transversalDeg);
  const topIntersection = lineIntersection(top, primary) ?? topCenter;
  const bottomIntersection = lineIntersection(bottom, primary) ?? bottomCenter;

  const secondaryCenter = pointOnRay(CENTER, orientationDeg, 76);
  const secondary = secondaryTransversalDeg == null
    ? null
    : segmentThrough(secondaryCenter, TRANSVERSAL_LENGTH, secondaryTransversalDeg);
  const topSecondaryIntersection = secondary ? lineIntersection(top, secondary) : null;
  const bottomSecondaryIntersection = secondary ? lineIntersection(bottom, secondary) : null;

  // Each intersection records the skew of its OWN line relative to the top
  // line, so angle sectors follow the line that actually passes through it.
  const intersections: Record<AngleMark['intersection'], { point: Point; transDeg: number; lineSkewDeg: number } | null> = {
    top: { point: topIntersection, transDeg: transversalDeg, lineSkewDeg: 0 },
    bottom: { point: bottomIntersection, transDeg: transversalDeg, lineSkewDeg: secondLineSkewDeg },
    'top-secondary': topSecondaryIntersection && secondaryTransversalDeg != null
      ? { point: topSecondaryIntersection, transDeg: secondaryTransversalDeg, lineSkewDeg: 0 }
      : null,
    'bottom-secondary': bottomSecondaryIntersection && secondaryTransversalDeg != null
      ? { point: bottomSecondaryIntersection, transDeg: secondaryTransversalDeg, lineSkewDeg: secondLineSkewDeg }
      : null,
  };

  const labelBounds = { minX: 0, minY: 0, maxX: W, maxY: H };
  const lineLabelOptions = { minWidth: 32, maxWidth: 190, charWidth: 11.5, height: 30, baseWidth: 18 };
  // Labels never sit on a drawn line (SPEC 10.3): every placement below checks all of these.
  const drawnSegments = [top, bottom, primary, ...(secondary ? [secondary] : [])];
  const occupiedLabelRects: Rect[] = [];

  /**
   * A line label goes near one end of its line, just off it. The original spot (far end,
   * preferred side, 18 units off) is tried first and kept whenever it is clean; otherwise the
   * other end / other side / a little farther out is used, instead of clamping the label onto
   * a line at the edge of the drawing.
   */
  const placeLineLabel = (center: Point, lineDeg: number, text: string, normalSign: 1 | -1): Point => {
    const candidates = LINE_LABEL_ALONG.flatMap(along =>
      [normalSign, -normalSign].flatMap(side =>
        LINE_LABEL_OFFSET.map(offset => labelPoint(center, lineDeg, along, side * offset)),
      ),
    );
    const scored = candidates.map((raw, order) => {
      const point = clampLabelPoint(raw, text, labelBounds, lineLabelOptions, 12);
      const spacing = estimateLabelRect(point, text, lineLabelOptions);
      const ink = estimateLabelRect(point, text, LABEL_INK_BOX);
      const collisions = occupiedLabelRects.filter(other => rectsOverlap(spacing, other, 6)).length;
      const lineHits = drawnSegments.filter(segment => segmentNearRect(segment, ink, 1)).length;
      const clampDistance = Math.hypot(point.x - raw.x, point.y - raw.y);
      return { point, spacing, penalty: (collisions + lineHits) * 1_000 + clampDistance * 2 + order * 0.5 };
    });
    const best = scored.reduce((winner, next) => (next.penalty < winner.penalty ? next : winner));
    occupiedLabelRects.push(best.spacing);
    return best.point;
  };

  const topLabel = placeLineLabel(topCenter, orientationDeg, lineLabels[0], -1);
  const bottomLabel = placeLineLabel(bottomCenter, bottomLineDeg, lineLabels[1], 1);

  const inkTouchesLine = (point: Point, text: string) =>
    drawnSegments.some(segment => segmentNearRect(segment, estimateLabelRect(point, text, LABEL_INK_BOX), 1));

  /**
   * A transversal label sits beside one end of its line, never on a drawn line (SPEC 10.3).
   * The far end (as before) is kept whenever it is clean; if that end runs off a crowded edge
   * of the drawing, the other end of the same line is used.
   */
  const placeTransversalLabel = (origin: Point, deg: number, text: string, angleOffsets: number[]): Point => {
    const attempt = (direction: number) => chooseRadialLabelPoint({
      origin,
      angleDeg: direction,
      text,
      preferredRadius: 154,
      bounds: labelBounds,
      occupied: occupiedLabelRects,
      radii: [166, 178, 190, 202],
      inset: 12,
      minGap: 8,
      angleOffsets,
      labelOptions: lineLabelOptions,
      avoid: drawnSegments,
    });
    const farEnd = attempt(deg);
    const placed = inkTouchesLine(farEnd.point, text)
      ? [attempt(deg + 180)].find(other => !inkTouchesLine(other.point, text)) ?? farEnd
      : farEnd;
    occupiedLabelRects.push(placed.rect);
    return placed.point;
  };

  const primaryLabel = placeTransversalLabel(CENTER, transversalDeg, transversalLabel, [0, 5, -5, 10, -10, 15, -15]);
  const secondaryLabel = secondary && secondaryTransversalDeg != null
    ? placeTransversalLabel(secondaryCenter, secondaryTransversalDeg, secondaryTransversalLabel, [0, 5, -5, 10, -10, 15, -15, 20, -20])
    : null;

  const renderedMarks = angleMarks.map((mark, index) => {
    const intersection = intersections[mark.intersection];
    if (!intersection) return null;
    const { start, end } = sectorAngles(orientationDeg, intersection.transDeg, mark.sector, intersection.lineSkewDeg);
    const safeStart = start + 5;
    const safeEnd = end - 5;
    const mid = start + (end - start) / 2;
    const label = mark.label ?? mark.value;
    let angleLabelPoint: Point | null = null;
    if (label) {
      const preferredRadius = labelRadiusFor(label, start, end);
      const placed = chooseRadialLabelPoint({
        origin: intersection.point,
        angleDeg: mid,
        text: label,
        preferredRadius,
        bounds: labelBounds,
        occupied: occupiedLabelRects,
        radii: [
          preferredRadius + 8,
          preferredRadius + 16,
          preferredRadius + 24,
          preferredRadius + 34,
          preferredRadius + 46,
          preferredRadius + 58,
          preferredRadius + 72,
          preferredRadius + 86,
        ],
        inset: 14,
        minGap: 8,
        angleOffsets: [0, 5, -5, 10, -10, 15, -15, 20, -20, 25, -25, 30, -30],
      });
      angleLabelPoint = placed.point;
      occupiedLabelRects.push(placed.rect);
    }
    return { mark, index, intersection, start: safeStart, end: safeEnd, label, angleLabelPoint };
  }).filter(Boolean) as Array<{
    mark: AngleMark;
    index: number;
    intersection: { point: Point; transDeg: number; lineSkewDeg: number };
    start: number;
    end: number;
    label: string | undefined;
    angleLabelPoint: Point | null;
  }>;

  return (
    <svg
      className="geometry-diagram geometry-diagram--premium"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={accessibleLabel}
      preserveAspectRatio="xMidYMid meet"
      shapeRendering="geometricPrecision"
      data-geometry-quality="premium"
      data-label-placement="collision-aware"
      data-line-relation={isSkewed ? 'non-parallel' : undefined}
      data-second-line-skew={isSkewed ? secondLineSkewDeg : undefined}
      focusable="false"
    >
      <title>{accessibleLabel}</title>
      <desc>{accessibleDesc}</desc>

      <g className="angle-sectors" aria-hidden="true">
        {renderedMarks.map(({ mark, index, intersection, start, end }) => (
          <path
            key={`fill-${mark.intersection}-${mark.sector}-${index}`}
            className={`${classForMark(mark)} angle-sector-fill`}
            d={angleSectorPath(intersection.point, 34, start, end)}
          />
        ))}
      </g>

      <g className="geometry-line-underlay" aria-hidden="true">
        <line x1={top.a.x} y1={top.a.y} x2={top.b.x} y2={top.b.y} />
        <line x1={bottom.a.x} y1={bottom.a.y} x2={bottom.b.x} y2={bottom.b.y} />
        <line x1={primary.a.x} y1={primary.a.y} x2={primary.b.x} y2={primary.b.y} />
        {secondary && <line x1={secondary.a.x} y1={secondary.a.y} x2={secondary.b.x} y2={secondary.b.y} />}
      </g>

      <g className="geometry-lines">
        <line x1={top.a.x} y1={top.a.y} x2={top.b.x} y2={top.b.y} />
        <line x1={bottom.a.x} y1={bottom.a.y} x2={bottom.b.x} y2={bottom.b.y} />
        <line x1={primary.a.x} y1={primary.a.y} x2={primary.b.x} y2={primary.b.y} />
        {secondary && <line x1={secondary.a.x} y1={secondary.a.y} x2={secondary.b.x} y2={secondary.b.y} />}
      </g>

      {/* Chevrons assert parallelism, so a skewed (non-parallel) pair never gets them. */}
      {showParallelMarks && !isSkewed && (
        <>
          <ParallelMark center={pointOnRay(topCenter, orientationDeg, -92)} lineDeg={orientationDeg} />
          <ParallelMark center={pointOnRay(bottomCenter, bottomLineDeg, -92)} lineDeg={bottomLineDeg} />
        </>
      )}

      <g className="geometry-intersections" aria-hidden="true">
        <circle cx={topIntersection.x} cy={topIntersection.y} r="2.55" />
        <circle cx={bottomIntersection.x} cy={bottomIntersection.y} r="2.55" />
        {topSecondaryIntersection && <circle cx={topSecondaryIntersection.x} cy={topSecondaryIntersection.y} r="2.55" />}
        {bottomSecondaryIntersection && <circle cx={bottomSecondaryIntersection.x} cy={bottomSecondaryIntersection.y} r="2.55" />}
      </g>

      <g className="geometry-labels" aria-hidden="true" direction="ltr">
        <text x={topLabel.x} y={topLabel.y} textAnchor="middle" dominantBaseline="middle">{lineLabels[0]}</text>
        <text x={bottomLabel.x} y={bottomLabel.y} textAnchor="middle" dominantBaseline="middle">{lineLabels[1]}</text>
        <text x={primaryLabel.x} y={primaryLabel.y} textAnchor="middle" dominantBaseline="middle">{transversalLabel}</text>
        {secondary && secondaryLabel && (
          <text x={secondaryLabel.x} y={secondaryLabel.y} textAnchor="middle" dominantBaseline="middle">{secondaryTransversalLabel}</text>
        )}
      </g>

      {renderedMarks.map(({ mark, index, intersection, start, end, label, angleLabelPoint }) => {
        const style = resolveAngleStyle(mark).arcStyle;
        return (
          <g key={`${mark.intersection}-${mark.sector}-${index}`} className={classForMark(mark)} data-angle-role={mark.role} data-angle-at={mark.intersection} data-angle-sector={mark.sector}>
            <path className="angle-arc angle-arc--inner" d={arcPath(intersection.point, 29, start, end)} />
            {style === 'double' && (
              <path className="angle-arc angle-arc--outer" d={arcPath(intersection.point, 36, start + 1, end - 1)} />
            )}
            {label && angleLabelPoint && (
              <>
                <LabelPlate point={angleLabelPoint} label={label} />
                <text
                  className="angle-label-text"
                  x={angleLabelPoint.x}
                  y={angleLabelPoint.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  direction="ltr"
                >
                  {label}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
