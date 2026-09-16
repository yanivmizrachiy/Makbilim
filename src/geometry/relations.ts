import { degToRad, normalizeAngle } from './core';

export type Sector = 0 | 1 | 2 | 3;
export type IntersectionName = 'top' | 'bottom';
export type PrimaryAngleRef = { intersection: IntersectionName; sector: Sector };
export type AnglePair = readonly [PrimaryAngleRef, PrimaryAngleRef];

function sectorMidpoints(lineDeg: number, transversalDeg: number) {
  const rays = [lineDeg, transversalDeg, lineDeg + 180, transversalDeg + 180]
    .map(normalizeAngle)
    .sort((a, b) => a - b);

  return rays.map((start, index) => {
    const next = rays[(index + 1) % rays.length]! + (index === rays.length - 1 ? 360 : 0);
    return normalizeAngle(start + (next - start) / 2);
  });
}

function vector(angleDeg: number) {
  const a = degToRad(angleDeg);
  return { x: Math.cos(a), y: Math.sin(a) };
}

function dot(a: { x: number; y: number }, b: { x: number; y: number }) {
  return a.x * b.x + a.y * b.y;
}

function cross(a: { x: number; y: number }, b: { x: number; y: number }) {
  return a.x * b.y - a.y * b.x;
}

export function correspondingPair(seed: Sector = 0): AnglePair {
  return [
    { intersection: 'top', sector: seed },
    { intersection: 'bottom', sector: seed },
  ];
}

export function verticalPair(intersection: IntersectionName, seed: Sector = 0): AnglePair {
  return [
    { intersection, sector: seed },
    { intersection, sector: ((seed + 2) % 4) as Sector },
  ];
}

export function adjacentPair(intersection: IntersectionName, seed: Sector = 0): AnglePair {
  return [
    { intersection, sector: seed },
    { intersection, sector: ((seed + 1) % 4) as Sector },
  ];
}

export function alternateInteriorPairs(lineDeg: number, transversalDeg: number): AnglePair[] {
  const mids = sectorMidpoints(lineDeg, transversalDeg);
  const towardBottom = vector(lineDeg + 90);
  const trans = vector(transversalDeg);

  const topInterior = mids
    .map((mid, sector) => ({ sector: sector as Sector, mid, interior: dot(vector(mid), towardBottom) > 0 }))
    .filter(item => item.interior);

  const bottomInterior = mids
    .map((mid, sector) => ({ sector: sector as Sector, mid, interior: dot(vector(mid), towardBottom) < 0 }))
    .filter(item => item.interior);

  const pairs: AnglePair[] = [];

  for (const top of topInterior) {
    const topSide = Math.sign(cross(trans, vector(top.mid)));
    const mate = bottomInterior.find(bottom => Math.sign(cross(trans, vector(bottom.mid))) === -topSide);
    if (mate) {
      pairs.push([
        { intersection: 'top', sector: top.sector },
        { intersection: 'bottom', sector: mate.sector },
      ]);
    }
  }

  return pairs;
}

export function alternatePair(lineDeg: number, transversalDeg: number, seed = 0): AnglePair {
  const pairs = alternateInteriorPairs(lineDeg, transversalDeg);
  if (pairs.length === 0) throw new Error('Could not derive alternate-interior angle pair');
  return pairs[seed % pairs.length]!;
}
