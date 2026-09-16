import React from 'react';
import { arcPath, lineIntersection, offsetPoint, pointOnRay, segmentThrough, type Point } from './core';

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

function ParallelMark({ center, lineDeg }: { center: Point; lineDeg: number }) {
  const firstCenter = pointOnRay(center, lineDeg, -7);
  const secondCenter = pointOnRay(center, lineDeg, 7);
  const tickDeg = lineDeg + 58;
  const first = segmentThrough(firstCenter, 16, tickDeg);
  const second = segmentThrough(secondCenter, 16, tickDeg);

  return (
    <g className="parallel-mark" aria-hidden="true">
      <line x1={first.a.x} y1={first.a.y} x2={first.b.x} y2={first.b.y} />
      <line x1={second.a.x} y1={second.a.y} x2={second.b.x} y2={second.b.y} />
    </g>
  );
}

function labelPoint(center: Point, lineDeg: number, along: number, normal: number): Point {
  return offsetPoint(pointOnRay(center, lineDeg, along), lineDeg, normal);
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

  const topLabel = labelPoint(topCenter, orientationDeg, 126, -14);
  const bottomLabel = labelPoint(bottomCenter, orientationDeg, 126, 14);
  const primaryLabel = labelPoint(CENTER, transversalDeg, 138, -13);
  const secondaryLabel = secondary ? labelPoint(secondaryCenter, secondaryTransversalDeg!, 138, 13) : null;

  return (
    <svg
      className="geometry-diagram"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="xMidYMid meet"
      shapeRendering="geometricPrecision"
    >
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

      <g className="geometry-labels" aria-hidden="true" direction="ltr">
        <text x={topLabel.x} y={topLabel.y} textAnchor="middle" dominantBaseline="middle">{lineLabels[0]}</text>
        <text x={bottomLabel.x} y={bottomLabel.y} textAnchor="middle" dominantBaseline="middle">{lineLabels[1]}</text>
        <text x={primaryLabel.x} y={primaryLabel.y} textAnchor="middle" dominantBaseline="middle">{transversalLabel}</text>
        {secondary && secondaryLabel && (
          <text x={secondaryLabel.x} y={secondaryLabel.y} textAnchor="middle" dominantBaseline="middle">{secondaryTransversalLabel}</text>
        )}
      </g>

      {angleMarks.map((mark, index) => {
        const intersection = intersections[mark.intersection];
        if (!intersection) return null;

        const { start, end } = sectorAngles(orientationDeg, intersection.transDeg, mark.sector);
        const mid = start + (end - start) / 2;
        const label = mark.label ?? mark.value;
        const labelRadius = label ? 48 : 0;
        const angleLabelPoint = label ? pointOnRay(intersection.point, mid, labelRadius) : null;
        const style = mark.arcStyle ?? 'single';

        return (
          <g key={`${mark.intersection}-${mark.sector}-${index}`} className={classForMark(mark)}>
            <path d={arcPath(intersection.point, 29, start + 5, end - 5)} />
            {style === 'double' && <path d={arcPath(intersection.point, 36, start + 6, end - 6)} />}
            {label && angleLabelPoint && (
              <text
                x={angleLabelPoint.x}
                y={angleLabelPoint.y}
                textAnchor="middle"
                dominantBaseline="middle"
                direction="ltr"
              >
                {label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
