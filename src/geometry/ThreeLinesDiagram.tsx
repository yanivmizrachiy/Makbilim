import React from 'react';
import { lineIntersection, offsetPoint, pointOnRay, segmentThrough, type Point } from './core';

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

  const lineLabelPoints = centers.map((center, index) => {
    const onLine = pointOnRay(center, orientationDeg, 186);
    const normal = index === 2 ? 13 : -13;
    return offsetPoint(onLine, orientationDeg, normal);
  });
  const transversalLabelPoint = offsetPoint(pointOnRay(CENTER, transversalDeg, 176), transversalDeg, -13);

  return (
    <svg
      className="geometry-diagram geometry-diagram--premium three-lines-diagram"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="xMidYMid meet"
      shapeRendering="geometricPrecision"
      data-geometry-quality="premium"
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

      {angleMarks.map((mark, index) => {
        const p = intersections[mark.line]!;
        const dx = mark.side === 'left' ? -31 : 31;
        const dy = mark.line === 0 ? 20 : mark.line === 2 ? -20 : 20;
        const labelPoint = { x: p.x + dx, y: p.y + dy };
        const label = mark.label ?? mark.value ?? '';
        return (
          <g key={index} className={`angle-mark angle-mark--${mark.tone ?? 'primary'} three-line-angle-mark`}>
            <line
              className="angle-callout"
              x1={p.x}
              y1={p.y}
              x2={p.x + dx * 0.58}
              y2={p.y + dy * 0.58}
              aria-hidden="true"
            />
            <rect
              className="angle-badge"
              x={labelPoint.x - Math.max(17, 9 + label.length * 5.5)}
              y={labelPoint.y - 14}
              width={Math.max(34, 18 + label.length * 11)}
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
        );
      })}
    </svg>
  );
}
