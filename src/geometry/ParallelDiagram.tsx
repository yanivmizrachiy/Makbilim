import React from 'react';

type DiagramSpec = {
  topology: string;
  lineLabels: string[];
  pointLabels?: string[];
  orientationDeg: number;
  transversalDeg: number;
  parallelGiven: boolean;
  highlights?: string[];
};

type Props = { spec: DiagramSpec; width?: number; height?: number };

const cx = 160;
const cy = 105;

function rotatePoint(x: number, y: number, deg: number) {
  const r = (deg * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  return {
    x: cx + dx * Math.cos(r) - dy * Math.sin(r),
    y: cy + dx * Math.sin(r) + dy * Math.cos(r),
  };
}

function lineAtAngle(angleDeg: number, length = 245) {
  const r = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(r) * length;
  const dy = Math.sin(r) * length;
  return { x1: cx - dx, y1: cy - dy, x2: cx + dx, y2: cy + dy };
}

export function ParallelDiagram({ spec, width = 320, height = 210 }: Props) {
  const top = { x1: 40, y1: 70, x2: 280, y2: 70 };
  const bottom = { x1: 40, y1: 145, x2: 280, y2: 145 };
  const t = lineAtAngle(spec.transversalDeg, 165);
  const l1 = [rotatePoint(top.x1, top.y1, spec.orientationDeg), rotatePoint(top.x2, top.y2, spec.orientationDeg)];
  const l2 = [rotatePoint(bottom.x1, bottom.y1, spec.orientationDeg), rotatePoint(bottom.x2, bottom.y2, spec.orientationDeg)];
  const tr1 = rotatePoint(t.x1, t.y1, spec.orientationDeg);
  const tr2 = rotatePoint(t.x2, t.y2, spec.orientationDeg);
  const labels = spec.lineLabels.length >= 3 ? spec.lineLabels : ['p', 'q', 'r'];

  return (
    <svg className="math-diagram" viewBox="0 0 320 210" width={width} height={height} role="img" aria-label="שרטוט ישרים וישר חותך">
      <defs>
        <marker id="parallelMark" markerWidth="12" markerHeight="12" refX="6" refY="6" orient="auto">
          <path d="M2 3 L6 6 L2 9" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </marker>
      </defs>
      <g className="diagram-lines">
        <line x1={l1[0].x} y1={l1[0].y} x2={l1[1].x} y2={l1[1].y} />
        <line x1={l2[0].x} y1={l2[0].y} x2={l2[1].x} y2={l2[1].y} />
        <line className="transversal" x1={tr1.x} y1={tr1.y} x2={tr2.x} y2={tr2.y} />
      </g>
      {spec.parallelGiven && (
        <g className="parallel-marks" aria-label="הישרים מסומנים כמקבילים">
          <path d="M118 63 l7 7 l-7 7 M126 63 l7 7 l-7 7" />
          <path d="M118 138 l7 7 l-7 7 M126 138 l7 7 l-7 7" />
        </g>
      )}
      <g className="diagram-labels" aria-hidden="true">
        <text x={34} y={58}>{labels[0]}</text>
        <text x={34} y={160}>{labels[1]}</text>
        <text x={274} y={32}>{labels[2]}</text>
      </g>
      {spec.highlights?.length ? (
        <g className="angle-highlight" aria-hidden="true">
          <path d="M150 77 A24 24 0 0 1 174 92" />
        </g>
      ) : null}
    </svg>
  );
}
