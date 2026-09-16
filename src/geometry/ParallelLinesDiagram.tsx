import React from 'react';
import { arcPath, lineIntersection, offsetPoint, pointOnRay, segmentThrough, type Point } from './core';

export type AngleMark = {
  intersection: 'top' | 'bottom' | 'top-secondary' | 'bottom-secondary';
  sector: 0 | 1 | 2 | 3;
  label?: string;
  value?: string;
  tone?: 'primary' | 'secondary' | 'neutral';
};

export type ParallelLinesDiagramProps = {
  lineLabels?: [string, string];
  transversalLabel?: string;
  secondaryTransversalLabel?: string;
  orientationDeg?: number;
  transversalDeg?: number;
  secondaryTransversalDeg?: number;
  showParallelMarks?: boolean;
  angleMarks?: AngleMark[];
  ariaLabel?: string;
};

const W = 520;
const H = 260;
const CENTER: Point = { x: W / 2, y: H / 2 };

function classForTone(tone: AngleMark['tone']) {
  return `angle-mark angle-mark--${tone ?? 'primary'}`;
}

function sectorAngles(lineDeg: number, transversalDeg: number, sector: AngleMark['sector']) {
  const rays = [lineDeg, transversalDeg, lineDeg + 180, transversalDeg + 180]
    .map(a => ((a % 360) + 360) % 360)
    .sort((a, b) => a - b);
  const start = rays[sector];
  const next = rays[(sector + 1) % rays.length] + (sector === rays.length - 1 ? 360 : 0);
  return { start, end: next };
}

function ParallelMark({ center, lineDeg }: { center: Point; lineDeg: number }) {
  const left = offsetPoint(center, lineDeg, -7);
  const right = offsetPoint(center, lineDeg, 7);
  const tickDeg = lineDeg + 62;
  const a = segmentThrough(left, 13, tickDeg);
  const b = segmentThrough(right, 13, tickDeg);
  return (
    <g className="parallel-mark" aria-hidden="true">
      <line x1={a.a.x} y1={a.a.y} x2={a.b.x} y2={a.b.y} />
      <line x1={b.a.x} y1={b.a.y} x2={b.b.x} y2={b.b.y} />
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
  const topCenter = offsetPoint(CENTER, orientationDeg, -48);
  const bottomCenter = offsetPoint(CENTER, orientationDeg, 48);
  const top = segmentThrough(topCenter, 410, orientationDeg);
  const bottom = segmentThrough(bottomCenter, 410, orientationDeg);
  const primary = segmentThrough(CENTER, 360, transversalDeg);
  const topIntersection = lineIntersection(top, primary) ?? topCenter;
  const bottomIntersection = lineIntersection(bottom, primary) ?? bottomCenter;

  const secondaryCenter = offsetPoint(CENTER, orientationDeg, 88);
  const secondary = secondaryTransversalDeg == null ? null : segmentThrough(secondaryCenter, 360, secondaryTransversalDeg);
  const topSecondaryIntersection = secondary ? lineIntersection(top, secondary) : null;
  const bottomSecondaryIntersection = secondary ? lineIntersection(bottom, secondary) : null;

  const intersections: Record<AngleMark['intersection'], { point: Point; transDeg: number } | null> = {
    top: { point: topIntersection, transDeg: transversalDeg },
    bottom: { point: bottomIntersection, transDeg: transversalDeg },
    'top-secondary': topSecondaryIntersection && secondaryTransversalDeg != null ? { point: topSecondaryIntersection, transDeg: secondaryTransversalDeg } : null,
    'bottom-secondary': bottomSecondaryIntersection && secondaryTransversalDeg != null ? { point: bottomSecondaryIntersection, transDeg: secondaryTransversalDeg } : null,
  };

  return (
    <svg className="geometry-diagram" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} preserveAspectRatio="xMidYMid meet">
      <g className="geometry-lines">
        <line x1={top.a.x} y1={top.a.y} x2={top.b.x} y2={top.b.y} />
        <line x1={bottom.a.x} y1={bottom.a.y} x2={bottom.b.x} y2={bottom.b.y} />
        <line x1={primary.a.x} y1={primary.a.y} x2={primary.b.x} y2={primary.b.y} />
        {secondary && <line x1={secondary.a.x} y1={secondary.a.y} x2={secondary.b.x} y2={secondary.b.y} />}
      </g>

      {showParallelMarks && (
        <>
          <ParallelMark center={pointOnRay(topCenter, orientationDeg, 105)} lineDeg={orientationDeg} />
          <ParallelMark center={pointOnRay(bottomCenter, orientationDeg, 105)} lineDeg={orientationDeg} />
        </>
      )}

      <g className="geometry-labels" aria-hidden="true">
        <text x={top.b.x - 18} y={top.b.y - 8}>{lineLabels[0]}</text>
        <text x={bottom.b.x - 18} y={bottom.b.y - 8}>{lineLabels[1]}</text>
        <text x={primary.b.x - 10} y={primary.b.y - 8}>{transversalLabel}</text>
        {secondary && <text x={secondary.b.x - 10} y={secondary.b.y - 8}>{secondaryTransversalLabel}</text>}
      </g>

      {angleMarks.map((mark, index) => {
        const intersection = intersections[mark.intersection];
        if (!intersection) return null;
        const { start, end } = sectorAngles(orientationDeg, intersection.transDeg, mark.sector);
        const mid = start + (end - start) / 2;
        const labelPoint = pointOnRay(intersection.point, mid, 38);
        return (
          <g key={`${mark.intersection}-${mark.sector}-${index}`} className={classForTone(mark.tone)}>
            <path d={arcPath(intersection.point, 27, start + 5, end - 5)} />
            {(mark.label || mark.value) && (
              <text x={labelPoint.x} y={labelPoint.y} textAnchor="middle" dominantBaseline="middle">
                {mark.label ?? mark.value}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
