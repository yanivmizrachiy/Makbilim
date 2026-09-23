export type Point = { x: number; y: number };
export type Segment = { a: Point; b: Point };

export const degToRad = (deg: number) => (deg * Math.PI) / 180;

export function pointOnRay(origin: Point, angleDeg: number, distance: number): Point {
  const a = degToRad(angleDeg);
  return {
    x: origin.x + Math.cos(a) * distance,
    y: origin.y + Math.sin(a) * distance,
  };
}

export function segmentThrough(center: Point, length: number, angleDeg: number): Segment {
  const half = length / 2;
  return {
    a: pointOnRay(center, angleDeg + 180, half),
    b: pointOnRay(center, angleDeg, half),
  };
}

export function offsetPoint(point: Point, angleDeg: number, distance: number): Point {
  return pointOnRay(point, angleDeg + 90, distance);
}

export function lineIntersection(
  first: Segment,
  second: Segment,
): Point | null {
  const x1 = first.a.x;
  const y1 = first.a.y;
  const x2 = first.b.x;
  const y2 = first.b.y;
  const x3 = second.a.x;
  const y3 = second.a.y;
  const x4 = second.b.x;
  const y4 = second.b.y;

  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denominator) < 1e-9) return null;

  const det1 = x1 * y2 - y1 * x2;
  const det2 = x3 * y4 - y3 * x4;

  return {
    x: (det1 * (x3 - x4) - (x1 - x2) * det2) / denominator,
    y: (det1 * (y3 - y4) - (y1 - y2) * det2) / denominator,
  };
}

export function normalizeAngle(deg: number): number {
  const normalized = deg % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function arcPath(
  center: Point,
  radius: number,
  startDeg: number,
  endDeg: number,
): string {
  const start = pointOnRay(center, startDeg, radius);
  const end = pointOnRay(center, endDeg, radius);
  const delta = normalizeAngle(endDeg - startDeg);
  const largeArc = delta > 180 ? 1 : 0;
  const sweep = 1;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}


export type Rect = { left: number; top: number; right: number; bottom: number };
export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

export function estimateLabelRect(
  point: Point,
  text: string,
  options: { minWidth?: number; maxWidth?: number; charWidth?: number; height?: number; baseWidth?: number } = {},
): Rect {
  const minWidth = options.minWidth ?? 28;
  const maxWidth = options.maxWidth ?? 82;
  const charWidth = options.charWidth ?? 10.4;
  const height = options.height ?? 27;
  const baseWidth = options.baseWidth ?? 17;
  const width = Math.max(minWidth, Math.min(maxWidth, baseWidth + text.length * charWidth));
  return {
    left: point.x - width / 2,
    top: point.y - height / 2,
    right: point.x + width / 2,
    bottom: point.y + height / 2,
  };
}

/**
 * Ink box of a printed line/transversal label (19px bold glyphs plus their white halo). Tighter
 * than the spacing box used between labels: "a label on a line" means ink touching ink.
 */
export const LABEL_INK_BOX = { minWidth: 13, maxWidth: 190, charWidth: 11, height: 20, baseWidth: 4 } as const;

/**
 * True when `segment` passes within `clearance` of `rect` — used so labels are never placed
 * on a drawn line (SPEC 10.3). Liang–Barsky clip of the segment against the grown rectangle.
 */
export function segmentNearRect(segment: Segment, rect: Rect, clearance = 0): boolean {
  const left = rect.left - clearance;
  const right = rect.right + clearance;
  const top = rect.top - clearance;
  const bottom = rect.bottom + clearance;
  const dx = segment.b.x - segment.a.x;
  const dy = segment.b.y - segment.a.y;
  let t0 = 0;
  let t1 = 1;
  const edges: Array<[number, number]> = [
    [-dx, segment.a.x - left],
    [dx, right - segment.a.x],
    [-dy, segment.a.y - top],
    [dy, bottom - segment.a.y],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
  }
  return true;
}

export function rectsOverlap(first: Rect, second: Rect, gap = 0): boolean {
  return !(
    first.right + gap <= second.left ||
    second.right + gap <= first.left ||
    first.bottom + gap <= second.top ||
    second.bottom + gap <= first.top
  );
}

export function rectWithinBounds(rect: Rect, bounds: Bounds, inset = 0): boolean {
  return (
    rect.left >= bounds.minX + inset &&
    rect.top >= bounds.minY + inset &&
    rect.right <= bounds.maxX - inset &&
    rect.bottom <= bounds.maxY - inset
  );
}

export function clampLabelPoint(
  point: Point,
  text: string,
  bounds: Bounds,
  options: { minWidth?: number; maxWidth?: number; charWidth?: number; height?: number; baseWidth?: number } = {},
  inset = 10,
): Point {
  const rect = estimateLabelRect(point, text, options);
  const halfWidth = (rect.right - rect.left) / 2;
  const halfHeight = (rect.bottom - rect.top) / 2;
  return {
    x: Math.min(bounds.maxX - inset - halfWidth, Math.max(bounds.minX + inset + halfWidth, point.x)),
    y: Math.min(bounds.maxY - inset - halfHeight, Math.max(bounds.minY + inset + halfHeight, point.y)),
  };
}

export function chooseRadialLabelPoint({
  origin,
  angleDeg,
  text,
  preferredRadius,
  bounds,
  occupied,
  inset = 10,
  minGap = 6,
  radii = [],
  angleOffsets = [0, 6, -6, 12, -12, 18, -18, 24, -24, 30, -30],
  labelOptions = {},
  avoid = [],
  lineClearance = 3,
}: {
  origin: Point;
  angleDeg: number;
  text: string;
  preferredRadius: number;
  bounds: Bounds;
  occupied: Rect[];
  inset?: number;
  minGap?: number;
  radii?: number[];
  angleOffsets?: number[];
  labelOptions?: { minWidth?: number; maxWidth?: number; charWidth?: number; height?: number; baseWidth?: number };
  /** Drawn lines the label must keep clear of; touching one costs as much as a label collision. */
  avoid?: Segment[];
  lineClearance?: number;
}): { point: Point; rect: Rect } {
  const radiusCandidates = [
    preferredRadius,
    ...radii,
    preferredRadius + 8,
    preferredRadius + 16,
    preferredRadius + 24,
    preferredRadius + 32,
    preferredRadius + 42,
    Math.max(30, preferredRadius - 8),
    Math.max(30, preferredRadius - 16),
  ].filter((value, index, all) => value > 0 && all.indexOf(value) === index);

  let fallback: { point: Point; rect: Rect } | null = null;
  let fallbackPenalty = Number.POSITIVE_INFINITY;

  for (const radius of radiusCandidates) {
    for (const offset of angleOffsets) {
      const rawPoint = pointOnRay(origin, angleDeg + offset, radius);
      const point = clampLabelPoint(rawPoint, text, bounds, labelOptions, inset);
      const rect = estimateLabelRect(point, text, labelOptions);
      const collisions = occupied.filter(other => rectsOverlap(rect, other, minGap)).length;
      const clampDistance = Math.hypot(point.x - rawPoint.x, point.y - rawPoint.y);
      const displacement = Math.abs(radius - preferredRadius) + Math.abs(offset) * 0.6 + clampDistance * 0.8;
      const lineHits = avoid.filter(segment => segmentNearRect(segment, rect, lineClearance)).length;
      const penalty = (collisions + lineHits) * 1_000 + displacement;

      if (collisions === 0 && lineHits === 0 && clampDistance < 0.01 && displacement === 0) return { point, rect };
      if (penalty < fallbackPenalty) {
        fallbackPenalty = penalty;
        fallback = { point, rect };
      }
    }
  }

  if (!fallback) {
    const rawPoint = pointOnRay(origin, angleDeg, preferredRadius);
    const point = clampLabelPoint(rawPoint, text, bounds, labelOptions, inset);
    return { point, rect: estimateLabelRect(point, text, labelOptions) };
  }
  return fallback;
}
