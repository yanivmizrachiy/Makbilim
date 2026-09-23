import {
  chooseRadialLabelPoint,
  clampLabelPoint,
  estimateLabelRect,
  lineIntersection,
  offsetPoint,
  pointOnRay,
  segmentThrough,
  type Point,
} from './core';

export type ThreeLineAngleMark = {
  line: 0 | 1 | 2;
  label?: string;
  value?: string;
  side?: 'left' | 'right';
  tone?: 'primary' | 'secondary' | 'neutral';
};

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
  const transversalPlaced = chooseRadialLabelPoint({
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
    const baseAngle = mark.side === 'left'
      ? 155 + (mark.line === 0 ? 8 : mark.line === 2 ? -8 : 0)
      : 25 + (mark.line === 0 ? 8 : mark.line === 2 ? -8 : 0);
    const placed = chooseRadialLabelPoint({
      origin: p,
      angleDeg: baseAngle,
      text: label,
      preferredRadius: 42,
      bounds: labelBounds,
      occupied: occupiedLabelRects,
      radii: [50, 58, 66, 76, 88, 100],
      inset: 14,
      minGap: 8,
      angleOffsets: [0, 7, -7, 14, -14, 21, -21, 28, -28, 35, -35],
      labelOptions: angleBadgeOptions,
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
