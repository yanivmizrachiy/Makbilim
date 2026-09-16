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
