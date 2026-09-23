import {
  arcPath,
  chooseRadialLabelPoint,
  clampLabelPoint,
  estimateLabelRect,
  lineIntersection,
  offsetPoint,
  pointOnRay,
  segmentThrough,
  type Point,
} from './core';

export type AngleMark = {
  intersection: 'top' | 'bottom' | 'top-secondary' | 'bottom-secondary';
  sector: 0 | 1 | 2 | 3;
  label?: string | undefined;
  value?: string | undefined;
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
  angleMarks?: AngleMark[] | undefined;
  ariaLabel?: string | undefined;
};

const W = 480;
const H = 320;
const CENTER: Point = { x: W / 2, y: H / 2 };
const PARALLEL_DISTANCE = 62;
const PARALLEL_LENGTH = 300;
const TRANSVERSAL_LENGTH = 330;

function classForMark(mark: AngleMark) {
  return `angle-mark angle-mark--${mark.tone ?? 'primary'} angle-mark--${mark.arcStyle ?? 'single'}`;
}

function sectorAngles(lineDeg: number, transversalDeg: number, sector: AngleMark['sector']) {
  const rays = [lineDeg, transversalDeg, lineDeg + 180, transversalDeg + 180]
    .map(angle => ((angle % 360) + 360) % 360)
    .sort((a, b) => a - b);

  const start = rays[sector]!;
  const nextBase = rays[(sector + 1) % rays.length]!;
  const next = nextBase + (sector === rays.length - 1 ? 360 : 0);
  return { start, end: next };
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
  showParallelMarks = true,
  angleMarks = [],
  ariaLabel = 'שרטוט של שני ישרים מקבילים וישר חותך',
}: ParallelLinesDiagramProps) {
  const topCenter = offsetPoint(CENTER, orientationDeg, -PARALLEL_DISTANCE);
  const bottomCenter = offsetPoint(CENTER, orientationDeg, PARALLEL_DISTANCE);
  const top = segmentThrough(topCenter, PARALLEL_LENGTH, orientationDeg);
  const bottom = segmentThrough(bottomCenter, PARALLEL_LENGTH, orientationDeg);

  const primary = segmentThrough(CENTER, TRANSVERSAL_LENGTH, transversalDeg);
  const topIntersection = lineIntersection(top, primary) ?? topCenter;
  const bottomIntersection = lineIntersection(bottom, primary) ?? bottomCenter;

  const secondaryCenter = pointOnRay(CENTER, orientationDeg, 76);
  const secondary = secondaryTransversalDeg == null
    ? null
    : segmentThrough(secondaryCenter, TRANSVERSAL_LENGTH, secondaryTransversalDeg);
  const topSecondaryIntersection = secondary ? lineIntersection(top, secondary) : null;
  const bottomSecondaryIntersection = secondary ? lineIntersection(bottom, secondary) : null;

  const intersections: Record<AngleMark['intersection'], { point: Point; transDeg: number } | null> = {
    top: { point: topIntersection, transDeg: transversalDeg },
    bottom: { point: bottomIntersection, transDeg: transversalDeg },
    'top-secondary': topSecondaryIntersection && secondaryTransversalDeg != null
      ? { point: topSecondaryIntersection, transDeg: secondaryTransversalDeg }
      : null,
    'bottom-secondary': bottomSecondaryIntersection && secondaryTransversalDeg != null
      ? { point: bottomSecondaryIntersection, transDeg: secondaryTransversalDeg }
      : null,
  };

  const labelBounds = { minX: 0, minY: 0, maxX: W, maxY: H };
  const lineLabelOptions = { minWidth: 32, maxWidth: 190, charWidth: 11.5, height: 30, baseWidth: 18 };
  const topLabel = clampLabelPoint(
    labelPoint(topCenter, orientationDeg, 142, -18),
    lineLabels[0],
    labelBounds,
    lineLabelOptions,
    12,
  );
  const bottomLabel = clampLabelPoint(
    labelPoint(bottomCenter, orientationDeg, 142, 18),
    lineLabels[1],
    labelBounds,
    lineLabelOptions,
    12,
  );

  const occupiedLabelRects = [
    estimateLabelRect(topLabel, lineLabels[0], lineLabelOptions),
    estimateLabelRect(bottomLabel, lineLabels[1], lineLabelOptions),
  ];

  const primaryPlaced = chooseRadialLabelPoint({
    origin: CENTER,
    angleDeg: transversalDeg,
    text: transversalLabel,
    preferredRadius: 154,
    bounds: labelBounds,
    occupied: occupiedLabelRects,
    radii: [166, 178, 190, 202],
    inset: 12,
    minGap: 8,
    angleOffsets: [0, 5, -5, 10, -10, 15, -15],
    labelOptions: lineLabelOptions,
  });
  const primaryLabel = primaryPlaced.point;
  occupiedLabelRects.push(primaryPlaced.rect);

  let secondaryLabel: Point | null = null;
  if (secondary && secondaryTransversalDeg != null) {
    const secondaryPlaced = chooseRadialLabelPoint({
      origin: secondaryCenter,
      angleDeg: secondaryTransversalDeg,
      text: secondaryTransversalLabel,
      preferredRadius: 154,
      bounds: labelBounds,
      occupied: occupiedLabelRects,
      radii: [166, 178, 190, 202],
      inset: 12,
      minGap: 8,
      angleOffsets: [0, 5, -5, 10, -10, 15, -15, 20, -20],
      labelOptions: lineLabelOptions,
    });
    secondaryLabel = secondaryPlaced.point;
    occupiedLabelRects.push(secondaryPlaced.rect);
  }

  const renderedMarks = angleMarks.map((mark, index) => {
    const intersection = intersections[mark.intersection];
    if (!intersection) return null;
    const { start, end } = sectorAngles(orientationDeg, intersection.transDeg, mark.sector);
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
    intersection: { point: Point; transDeg: number };
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
      aria-label={ariaLabel}
      preserveAspectRatio="xMidYMid meet"
      shapeRendering="geometricPrecision"
      data-geometry-quality="premium"
      data-label-placement="collision-aware"
      focusable="false"
    >
      <title>{ariaLabel}</title>
      <desc>שרטוט וקטורי מדויק עם סימוני מקבילות, הדגשת זוויות ותוויות סמנטיות.</desc>

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

      {showParallelMarks && (
        <>
          <ParallelMark center={pointOnRay(topCenter, orientationDeg, -92)} lineDeg={orientationDeg} />
          <ParallelMark center={pointOnRay(bottomCenter, orientationDeg, -92)} lineDeg={orientationDeg} />
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
        const style = mark.arcStyle ?? 'single';
        return (
          <g key={`${mark.intersection}-${mark.sector}-${index}`} className={classForMark(mark)}>
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
