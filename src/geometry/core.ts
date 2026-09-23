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

export type Rect = { left: number; top: number; right: number; bottom: number };

/**
 * Liang–Barsky: the parameter range [t0, t1] (0 = segment.a, 1 = segment.b) of the part of
 * `segment` inside `rect`, or null when the segment misses it. The single clipping routine of
 * the geometry engine.
 */
export function clipSegmentToRect(segment: Segment, rect: Rect): [number, number] | null {
  const dx = segment.b.x - segment.a.x;
  const dy = segment.b.y - segment.a.y;
  let t0 = 0;
  let t1 = 1;
  const edges: Array<[number, number]> = [
    [-dx, segment.a.x - rect.left],
    [dx, rect.right - segment.a.x],
    [-dy, segment.a.y - rect.top],
    [dy, rect.bottom - segment.a.y],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return null;
      continue;
    }
    const t = q / p;
    if (p < 0) {
      if (t > t1) return null;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return null;
      if (t < t1) t1 = t;
    }
  }
  return t0 <= t1 ? [t0, t1] : null;
}

/** True when `segment` passes within `clearance` of `rect` — so labels never sit on a drawn line (SPEC 10.3). */
export function segmentNearRect(segment: Segment, rect: Rect, clearance = 0): boolean {
  const grown = { left: rect.left - clearance, top: rect.top - clearance, right: rect.right + clearance, bottom: rect.bottom + clearance };
  return clipSegmentToRect(segment, grown) !== null;
}
