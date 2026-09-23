/**
 * Drawing primitives shared by every line diagram, so all of them look drawn by one hand:
 * the same lines, solid crossing dots, parallel chevrons, angle arcs and haloed labels.
 * Sizes and colours come from geometryTokens / the --geo-* custom properties, never from here.
 */
import type { ReactNode } from 'react';
import type { DiagramSize } from '../styles/tokens';
import { geometryTokens as T } from '../styles/tokens';
import type { Chevron, FigureLayout, LaidOutMark, PlacedLabel } from './engine';
import { mm } from './engine';
import { SUBSCRIPT_DROP_EM } from './label-font';
import type { Segment } from './core';

const LABEL_CLASS: Record<PlacedLabel['kind'], string> = {
  angle: 'angle-label-text',
  index: 'angle-label-text angle-label-text--index',
  line: 'line-label-text',
};

/** A label: plain text in the math face with a white knockout halo (paint-order: stroke). */
export function DiagramLabel({ label }: { label: PlacedLabel }) {
  const { shaped } = label;
  const drop = round(SUBSCRIPT_DROP_EM * label.fontPx);
  let lowered = false;
  const content = shaped.runs.map((run, index) => {
    const shift = run.sub === lowered ? 0 : run.sub ? drop : -drop;
    lowered = run.sub;
    if (!run.sub && shift === 0) return run.text;
    return (
      <tspan key={index} className={run.sub ? 'label-sub' : undefined} dy={shift}>
        {run.text}
      </tspan>
    );
  });
  return (
    <text
      className={LABEL_CLASS[label.kind]}
      x={round(label.x)}
      y={round(label.y)}
      textAnchor="middle"
      direction="ltr"
      data-label={shaped.source}
    >
      {content}
    </text>
  );
}

function ChevronMark({ chevron }: { chevron: Chevron }) {
  return (
    <g
      className="parallel-mark parallel-mark--chevrons"
      transform={`translate(${round(chevron.center.x)} ${round(chevron.center.y)}) rotate(${round(chevron.deg)})`}
      aria-hidden="true"
    >
      <polyline points={chevron.points[0]} />
      <polyline points={chevron.points[1]} />
    </g>
  );
}

const round = (value: number) => Math.round(value * 1000) / 1000;

function Leader({ segment }: { segment: Segment }) {
  return <line className="angle-leader" x1={round(segment.a.x)} y1={round(segment.a.y)} x2={round(segment.b.x)} y2={round(segment.b.y)} />;
}

export type MarkPresentation = {
  className: string;
  attributes?: Record<string, string | number | undefined>;
};

/**
 * The whole figure. Lines are written at full precision (the verifier and tests measure
 * directions to 1e-6°); everything decorative is rounded to 0.001 px.
 */
export function Figure({
  layout,
  size,
  className,
  ariaLabel,
  description,
  marks,
  svgAttributes = {},
}: {
  layout: FigureLayout;
  size: DiagramSize;
  className: string;
  ariaLabel: string;
  description: string;
  marks: MarkPresentation[];
  svgAttributes?: Record<string, string | number | undefined>;
}) {
  const { viewBox } = layout;
  const width = round(viewBox.width);
  const height = round(viewBox.height);
  return (
    <svg
      className={className}
      viewBox={`${round(viewBox.x)} ${round(viewBox.y)} ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="xMidYMid meet"
      shapeRendering="geometricPrecision"
      data-geometry-quality="premium"
      data-label-placement="collision-aware"
      data-diagram-size={size}
      data-geometry-scale={layout.scale.toFixed(3)}
      data-label-fit={layout.complete ? 'complete' : 'forced'}
      {...svgAttributes}
      focusable="false"
    >
      <title>{ariaLabel}</title>
      <desc>{description}</desc>

      <g className="geometry-lines">
        {layout.segments.map((segment, index) => (
          <line key={index} x1={segment.a.x} y1={segment.a.y} x2={segment.b.x} y2={segment.b.y} />
        ))}
      </g>

      {layout.chevrons.map((chevron, index) => <ChevronMark key={index} chevron={chevron} />)}

      <g className="geometry-intersections" aria-hidden="true">
        {layout.dots.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r={round(mm(T.dotRadiusMm))} />)}
      </g>

      {layout.marks.map((laid, index) => (
        <MarkGroup key={index} laid={laid} presentation={marks[index] ?? { className: 'angle-mark' }} />
      ))}

      <g className="geometry-labels" aria-hidden="true" direction="ltr">
        {layout.lineLabels.map((label, index) => (label ? <DiagramLabel key={index} label={label} /> : null))}
      </g>
    </svg>
  );
}

function MarkGroup({ laid, presentation }: { laid: LaidOutMark; presentation: MarkPresentation }): ReactNode {
  const className = laid.index ? `${presentation.className} angle-mark--index` : presentation.className;
  return (
    <g className={className} {...(presentation.attributes ?? {})}>
      {laid.arcs.map((arc, index) => (
        <path key={index} className={index === 0 ? 'angle-arc angle-arc--inner' : 'angle-arc angle-arc--outer'} d={arc.d} />
      ))}
      {laid.label?.leader && <Leader segment={laid.label.leader} />}
      {laid.label && <DiagramLabel label={laid.label} />}
    </g>
  );
}

