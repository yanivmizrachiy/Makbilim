import React from 'react';
import { lineIntersection, offsetPoint, segmentThrough, type Point } from './core';

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

function Tick({ center, lineDeg }: { center: Point; lineDeg: number }) {
  const a = segmentThrough(center, 15, lineDeg + 62);
  return <line className="parallel-tick" x1={a.a.x} y1={a.a.y} x2={a.b.x} y2={a.b.y} />;
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

  return (
    <svg className="geometry-diagram three-lines-diagram" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
      <g className="geometry-lines">
        {lines.map((line, index) => <line key={index} x1={line.a.x} y1={line.a.y} x2={line.b.x} y2={line.b.y} />)}
        <line x1={transversal.a.x} y1={transversal.a.y} x2={transversal.b.x} y2={transversal.b.y} />
      </g>

      <g className="parallel-mark" aria-hidden="true">
        {parallelPair.map(index => <Tick key={index} center={offsetPoint(centers[index]!, orientationDeg, 108)} lineDeg={orientationDeg} />)}
      </g>

      <g className="geometry-labels" aria-hidden="true">
        {lines.map((line, index) => <text key={index} x={line.b.x - 18} y={line.b.y - 8}>{lineLabels[index]}</text>)}
        <text x={transversal.b.x - 10} y={transversal.b.y - 8}>{transversalLabel}</text>
      </g>

      {angleMarks.map((mark, index) => {
        const p = intersections[mark.line]!;
        const dx = mark.side === 'left' ? -28 : 28;
        const dy = mark.line === 0 ? 18 : mark.line === 2 ? -18 : 18;
        return (
          <g key={index} className={`angle-mark angle-mark--${mark.tone ?? 'primary'}`}>
            <circle cx={p.x + dx * 0.34} cy={p.y + dy * 0.34} r="13" className="angle-badge" />
            <text x={p.x + dx} y={p.y + dy} textAnchor="middle" dominantBaseline="middle">{mark.label ?? mark.value}</text>
          </g>
        );
      })}
    </svg>
  );
}
