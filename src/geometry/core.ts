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
  options: { minWidth?: number; maxWidth?: number; charWidth?: number; height?: number } = {},
): Rect {
  const minWidth = options.minWidth ?? 28;
  const maxWidth = options.maxWidth ?? 82;
  const charWidth = options.charWidth ?? 10.4;
  const height = options.height ?? 27;
  const width = Math.max(minWidth, Math.min(maxWidth, 17 + text.length * charWidth));
  return {
    left: point.x - width / 2,
    top: point.y - height / 2,
    right: point.x + width / 2,
    bottom: point.y + height / 2,
  };
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
      const point = pointOnRay(origin, angleDeg + offset, radius);
      const rect = estimateLabelRect(point, text);
      const outOfBounds = rectWithinBounds(rect, bounds, inset) ? 0 : 10_000;
      const collisions = occupied.filter(other => rectsOverlap(rect, other, minGap)).length;
      const displacement = Math.abs(radius - preferredRadius) + Math.abs(offset) * 0.6;
      const penalty = outOfBounds + collisions * 1_000 + displacement;

      if (penalty === 0) return { point, rect };
      if (penalty < fallbackPenalty) {
        fallbackPenalty = penalty;
        fallback = { point, rect };
      }
    }
  }

  if (!fallback) {
    const point = pointOnRay(origin, angleDeg, preferredRadius);
    return { point, rect: estimateLabelRect(point, text) };
  }
  return fallback;
}
