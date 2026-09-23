import {
  chooseRadialLabelPoint,
  clampLabelPoint,
  clipSegmentToRect,
  estimateLabelRect,
  lineIntersection,
  normalizeAngle,
  offsetPoint,
  pointOnRay,
  rectsOverlap,
  rectWithinBounds,
  segmentNearRect,
  segmentThrough,
  type Bounds,
  type Point,
  type Rect,
  type Segment,
} from './core';

export type ThreeLineAngleMark = {
  line: 0 | 1 | 2;
  label?: string;
  value?: string;
  /**
   * Which of the two angles on the transversal's "downstream" side of the line is meant:
   * 'right' lies between the line's forward ray (orientationDeg) and that transversal ray,
   * 'left' between that transversal ray and the line's backward ray (see `markSector`).
   * The same side at two crossings therefore names corresponding angles.
   */
  side?: 'left' | 'right';
  tone?: 'primary' | 'secondary' | 'neutral';
};

/** An angle sector at a crossing: from direction `start`, clockwise (SVG) over `width` degrees. */
export type AngleSector = { start: number; width: number };

/**
 * The sector a mark names at a crossing of a line (direction `lineDeg`) with the transversal.
 * "Downstream" is the transversal ray that turns clockwise from the line's forward ray by less
 * than 180°, so the result does not depend on which of the two directions `transversalDeg` uses.
 */
export function markSector(lineDeg: number, transversalDeg: number, side: 'left' | 'right'): AngleSector {
  const forward = normalizeAngle(lineDeg);
  const downstream = normalizeAngle(transversalDeg - lineDeg) < 180
    ? normalizeAngle(transversalDeg)
    : normalizeAngle(transversalDeg + 180);
  const gap = normalizeAngle(downstream - forward);
  return side === 'left' ? { start: downstream, width: 180 - gap } : { start: forward, width: gap };
}

/** Whether direction `deg` lies inside `sector`, at least `margin` degrees from both bounding rays. */
export function directionInSector(deg: number, sector: AngleSector, margin = 0): boolean {
  const offset = normalizeAngle(deg - sector.start);
  return offset >= margin && offset <= sector.width - margin;
}

/**
 * Label for a line that runs out of the view box: beside the line near its visible end (the
 * forward end first), clear of every drawn line and every other label. Returns null when no
 * such spot exists.
 */
export function placeLineEndLabel({
  line,
  text,
  bounds,
  occupied,
  segments,
  options,
}: {
  line: Segment;
  text: string;
  bounds: Bounds;
  occupied: Rect[];
  segments: Segment[];
  options: BadgeOptions;
}): { point: Point; rect: Rect } | null {
  const inset = 12;
  const inner = { left: bounds.minX + inset, top: bounds.minY + inset, right: bounds.maxX - inset, bottom: bounds.maxY - inset };
  const range = clipSegmentToRect(line, inner);
  if (!range) return null;
  const dx = line.b.x - line.a.x;
  const dy = line.b.y - line.a.y;
  const length = Math.hypot(dx, dy);
  const dir = { x: dx / length, y: dy / length };
  const normal = { x: -dir.y, y: dir.x };
  const at = (t: number): Point => ({ x: line.a.x + dx * t, y: line.a.y + dy * t });
  const ends: Array<{ end: Point; inward: number }> = [
    { end: at(range[1]), inward: -1 },
    { end: at(range[0]), inward: 1 },
  ];
  for (const { end, inward } of ends) {
    for (const back of [12, 20, 28, 36, 44, 52, 60, 70]) {
      for (const gap of [18, 22, 26]) {
        for (const side of [1, -1]) {
          const point = {
            x: end.x + dir.x * inward * back + normal.x * side * gap,
            y: end.y + dir.y * inward * back + normal.y * side * gap,
          };
          const rect = estimateLabelRect(point, text, options);
          if (!rectWithinBounds(rect, bounds, inset)) continue;
          if (occupied.some(other => rectsOverlap(rect, other, 8))) continue;
          if (segments.some(segment => segmentNearRect(segment, rect, 3))) continue;
          return { point, rect };
        }
      }
    }
  }
  return null;
}

type BadgeOptions = { minWidth: number; maxWidth: number; charWidth: number; height: number; baseWidth: number };

/**
 * Badge position for an angle mark. Every candidate direction lies strictly inside the marked
 * sector, and a candidate is accepted only if (after clamping into the view box) its callout
 * still points into that sector with a clear margin, its badge crosses no drawn line, and it
 * overlaps no other label. Collision avoidance can therefore move a badge along or away from
 * its angle, but never across a line into a neighbouring angle.
 */
export function placeAngleBadge({
  vertex,
  sector,
  text,
  bounds,
  occupied,
  segments,
  options,
}: {
  vertex: Point;
  sector: AngleSector;
  text: string;
  bounds: Bounds;
  occupied: Rect[];
  segments: Segment[];
  options: BadgeOptions;
}): { point: Point; rect: Rect } {
  const inset = 14;
  const minGap = 8;
  const linePad = 3;
  const calloutMargin = Math.min(8, sector.width / 4);
  const bisector = sector.start + sector.width / 2;
  const reach = sector.width / 2 - calloutMargin;
  const offsets = [0, 6, -6, 12, -12, 18, -18, 24, -24, 30, -30, 36, -36, 42, -42, 48, -48, 54, -54, 60, -60]
    .filter(offset => Math.abs(offset) <= reach);
  const radii = [44, 50, 58, 66, 76, 88, 100, 114];

  let best: { point: Point; rect: Rect; penalty: number } | null = null;
  for (const radius of radii) {
    for (const offset of offsets) {
      const raw = pointOnRay(vertex, bisector + offset, radius);
      const point = clampLabelPoint(raw, text, bounds, options, inset);
      const direction = (Math.atan2(point.y - vertex.y, point.x - vertex.x) * 180) / Math.PI;
      if (!directionInSector(direction, sector, calloutMargin)) continue;
      const rect = estimateLabelRect(point, text, options);
      const collisions = occupied.filter(other => rectsOverlap(rect, other, minGap)).length;
      const lineHits = segments.filter(segment => segmentNearRect(segment, rect, linePad)).length;
      const clampDistance = Math.hypot(point.x - raw.x, point.y - raw.y);
      if (collisions === 0 && lineHits === 0) return { point, rect };
      const penalty = collisions * 1_000 + lineHits * 400 + radius + Math.abs(offset) * 0.6 + clampDistance * 0.8;
      if (!best || penalty < best.penalty) best = { point, rect, penalty };
    }
  }
  if (best) return { point: best.point, rect: best.rect };
  const point = pointOnRay(vertex, bisector, radii[0]!);
  return { point, rect: estimateLabelRect(point, text, options) };
}

export type ThreeLinesDiagramProps = {
  lineLabels?: [string, string, string];
  transversalLabel?: string;
  orientationDeg?: number;
  transversalDeg?: number;
  parallelPair?: [0 | 1 | 2, 0 | 1 | 2];
  angleMarks?: ThreeLineAngleMark[];
  ariaLabel?: string;
};

const W = 520;
const H = 280;
const CENTER: Point = { x: W / 2, y: H / 2 };

function ParallelChevron({ center, lineDeg }: { center: Point; lineDeg: number }) {
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

export function ThreeLinesDiagram({
  lineLabels = ['p', 'q', 'r'],
  transversalLabel = 't',
  orientationDeg = 0,
  transversalDeg = 61,
  parallelPair = [0, 1],
  angleMarks = [],
  ariaLabel = 'שלושה ישרים וישר חותך',
}: ThreeLinesDiagramProps) {
  const offsets = [-72, 0, 72] as const;
  const centers = offsets.map(offset => offsetPoint(CENTER, orientationDeg, offset));
  const lines = centers.map(center => segmentThrough(center, 410, orientationDeg));
  const transversal = segmentThrough(CENTER, 390, transversalDeg);
  const intersections = lines.map((line, index) => lineIntersection(line, transversal) ?? centers[index]!);

  const labelBounds = { minX: 0, minY: 0, maxX: W, maxY: H };
  const lineLabelOptions = { minWidth: 32, maxWidth: 190, charWidth: 11.5, height: 30, baseWidth: 18 };
  const angleBadgeOptions = { minWidth: 34, maxWidth: 120, charWidth: 11, height: 28, baseWidth: 18 };
  const lineLabelPoints = centers.map((center, index) => {
    const onLine = pointOnRay(center, orientationDeg, 186);
    const normal = index === 2 ? 13 : -13;
    return clampLabelPoint(
      offsetPoint(onLine, orientationDeg, normal),
      lineLabels[index] ?? '',
      labelBounds,
      lineLabelOptions,
      12,
    );
  });
  const occupiedLabelRects = lineLabelPoints.map((point, index) =>
    estimateLabelRect(point, lineLabels[index] ?? '', lineLabelOptions),
  );
  const drawnSegments = [...lines, transversal];
  // The transversal is longer than the view box is tall, so a label "at its end" would be
  // clamped somewhere else (possibly beside another line). Place it beside the visible end.
  const transversalPlaced = placeLineEndLabel({
    line: transversal,
    text: transversalLabel,
    bounds: labelBounds,
    occupied: occupiedLabelRects,
    segments: drawnSegments,
    options: lineLabelOptions,
  }) ?? chooseRadialLabelPoint({
    origin: CENTER,
    angleDeg: transversalDeg,
    text: transversalLabel,
    preferredRadius: 176,
    bounds: labelBounds,
    occupied: occupiedLabelRects,
    radii: [188, 200, 212],
    inset: 12,
    minGap: 8,
    angleOffsets: [0, 5, -5, 10, -10, 15, -15],
    labelOptions: lineLabelOptions,
  });
  const transversalLabelPoint = transversalPlaced.point;
  occupiedLabelRects.push(transversalPlaced.rect);

  const renderedMarks = angleMarks.map((mark, index) => {
    const p = intersections[mark.line]!;
    const label = mark.label ?? mark.value ?? '';
    const placed = placeAngleBadge({
      vertex: p,
      sector: markSector(orientationDeg, transversalDeg, mark.side ?? 'right'),
      text: label,
      bounds: labelBounds,
      occupied: occupiedLabelRects,
      segments: drawnSegments,
      options: angleBadgeOptions,
    });
    occupiedLabelRects.push(placed.rect);
    return { mark, index, p, labelPoint: placed.point, label };
  });

  return (
    <svg
      className="geometry-diagram geometry-diagram--premium three-lines-diagram"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="xMidYMid meet"
      shapeRendering="geometricPrecision"
      data-geometry-quality="premium"
      data-label-placement="collision-aware"
      focusable="false"
    >
      <title>{ariaLabel}</title>
      <desc>שרטוט וקטורי מדויק של שלושה ישרים וישר חותך, עם סימוני מקבילות והדגשות סמנטיות.</desc>

      <g className="geometry-line-underlay" aria-hidden="true">
        {lines.map((line, index) => <line key={`underlay-${index}`} x1={line.a.x} y1={line.a.y} x2={line.b.x} y2={line.b.y} />)}
        <line x1={transversal.a.x} y1={transversal.a.y} x2={transversal.b.x} y2={transversal.b.y} />
      </g>

      <g className="geometry-lines">
        {lines.map((line, index) => <line key={index} x1={line.a.x} y1={line.a.y} x2={line.b.x} y2={line.b.y} />)}
        <line x1={transversal.a.x} y1={transversal.a.y} x2={transversal.b.x} y2={transversal.b.y} />
      </g>

      {parallelPair.map(index => (
        <ParallelChevron
          key={index}
          center={pointOnRay(centers[index]!, orientationDeg, -112)}
          lineDeg={orientationDeg}
        />
      ))}

      <g className="geometry-intersections" aria-hidden="true">
        {intersections.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="2.55" />)}
      </g>

      <g className="geometry-labels" aria-hidden="true" direction="ltr">
        {lineLabelPoints.map((point, index) => (
          <text key={index} x={point.x} y={point.y} textAnchor="middle" dominantBaseline="middle">
            {lineLabels[index]}
          </text>
        ))}
        <text
          x={transversalLabelPoint.x}
          y={transversalLabelPoint.y}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {transversalLabel}
        </text>
      </g>

      {renderedMarks.map(({ mark, index, p, labelPoint, label }) => (
          <g key={index} className={`angle-mark angle-mark--${mark.tone ?? 'primary'} three-line-angle-mark`}>
            <line
              className="angle-callout"
              x1={p.x}
              y1={p.y}
              x2={p.x + (labelPoint.x - p.x) * 0.58}
              y2={p.y + (labelPoint.y - p.y) * 0.58}
              aria-hidden="true"
            />
            <rect
              className="angle-badge"
              x={labelPoint.x - Math.max(17, 9 + label.length * 5.5)}
              y={labelPoint.y - 14}
              width={Math.max(34, Math.min(120, 18 + label.length * 11))}
              height="28"
              rx="8"
              ry="8"
              aria-hidden="true"
            />
            <text
              className="angle-label-text"
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              direction="ltr"
            >
              {label}
            </text>
          </g>
      ))}
    </svg>
  );
}
