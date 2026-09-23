import { normalizeAngle, type Point } from './core';
import { resolveAngleStyle, type AngleRole } from './angle-roles';
import { useDiagramSize, type DiagramSize } from './diagram-size';
import { layoutFigure, type FigureMark, type FigureSpec } from './engine';
import { Figure, type MarkPresentation } from './primitives';

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
  /** Preferred: the angle's pedagogical role, styled centrally in angle-roles.ts. */
  role?: AngleRole;
  /** Explicit styling — only when the task text itself refers to the arc form. Never combined with `role`. */
  tone?: 'primary' | 'secondary' | 'neutral';
  arcStyle?: 'single' | 'double' | 'dashed';
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

export type ThreeLinesDiagramProps = {
  lineLabels?: [string, string, string];
  transversalLabel?: string;
  orientationDeg?: number;
  transversalDeg?: number;
  parallelPair?: [0 | 1 | 2, 0 | 1 | 2];
  angleMarks?: ThreeLineAngleMark[];
  ariaLabel?: string;
  /** Size class; by default the one of the enclosing question (see diagram-size.tsx). */
  size?: DiagramSize | undefined;
};

/** Three lines span two gaps, so their nominal gap is a little over half a two-line figure's. */
const THREE_LINES_NOMINAL_FACTOR = 0.6;

type ThreeLinesInput = Required<Omit<ThreeLinesDiagramProps, 'ariaLabel' | 'size'>>;

const unitVector = (deg: number): Point => ({ x: Math.cos((deg * Math.PI) / 180), y: Math.sin((deg * Math.PI) / 180) });

/**
 * Three lines, one gap apart, crossed by one transversal through the middle line. Built on the
 * same engine and primitives as ParallelLinesDiagram: real arcs, haloed labels, the same
 * clearance search for every line name.
 */
function buildFigure(gap: number, input: ThreeLinesInput): FigureSpec {
  const normal = unitVector(input.orientationDeg + 90);
  const chevronLines = new Set<number>(input.parallelPair);
  const lines: FigureSpec['lines'] = ([-1, 0, 1] as const).map((step, index) => ({
    kind: 'given' as const,
    anchor: { x: normal.x * step * gap, y: normal.y * step * gap },
    deg: input.orientationDeg,
    label: input.lineLabels[index],
    chevrons: chevronLines.has(index as 0 | 1 | 2),
    labelSide: (index === 2 ? 1 : -1) as 1 | -1,
  }));
  lines.push({ kind: 'transversal', anchor: { x: 0, y: 0 }, deg: input.transversalDeg, label: input.transversalLabel, labelSide: 1 });
  const marks: FigureMark[] = input.angleMarks.map(mark => {
    const sector = markSector(input.orientationDeg, input.transversalDeg, mark.side ?? 'right');
    return {
      given: mark.line,
      transversal: 3,
      start: sector.start,
      end: sector.start + sector.width,
      arcStyle: resolveAngleStyle(mark).arcStyle,
      label: mark.label ?? mark.value,
    };
  });
  return { lines, marks };
}

export function ThreeLinesDiagram({
  lineLabels = ['p', 'q', 'r'],
  transversalLabel = 't',
  orientationDeg = 0,
  transversalDeg = 61,
  parallelPair = [0, 1],
  angleMarks = [],
  ariaLabel = 'שלושה ישרים וישר חותך',
  size: sizeProp,
}: ThreeLinesDiagramProps) {
  const size = useDiagramSize(sizeProp);
  const input: ThreeLinesInput = { lineLabels, transversalLabel, orientationDeg, transversalDeg, parallelPair, angleMarks };
  const layout = layoutFigure(`three|${JSON.stringify(input)}`, size, gap => buildFigure(gap, input), THREE_LINES_NOMINAL_FACTOR);
  const presentations: MarkPresentation[] = angleMarks.map(mark => {
    const { tone, arcStyle } = resolveAngleStyle(mark);
    return {
      className: `angle-mark angle-mark--${tone} angle-mark--${arcStyle} three-line-angle-mark`,
      attributes: { 'data-angle-role': mark.role, 'data-angle-line': mark.line, 'data-angle-side': mark.side ?? 'right' },
    };
  });
  return (
    <Figure
      layout={layout}
      size={size}
      className="geometry-diagram geometry-diagram--premium three-lines-diagram"
      ariaLabel={ariaLabel}
      description="שרטוט של שלושה ישרים וישר חותך; סימוני מקבילות מציינים את הישרים המקבילים, וזוויות מסומנות בקשתות."
      marks={presentations}
    />
  );
}
