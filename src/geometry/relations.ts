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

const OTHER_LINE: Record<IntersectionName, IntersectionName> = { top: 'bottom', bottom: 'top' };

/** Orders a pair so that its first angle sits on line `from` (by convention the given angle). */
function startingAt(pair: AnglePair, from: IntersectionName): AnglePair {
  return pair[0].intersection === from ? pair : [pair[1], pair[0]];
}

/**
 * The corresponding pair in sector `seed`. The first angle sits on line `from` — pages put the
 * given angle first, so `from` decides whether the given is on the top or the bottom line.
 */
export function correspondingPair(seed: Sector = 0, from: IntersectionName = 'top'): AnglePair {
  return [
    { intersection: from, sector: seed },
    { intersection: OTHER_LINE[from], sector: seed },
  ];
}

/**
 * Sizes (degrees) of the four sectors at a crossing of a line (direction `lineDeg`) with a
 * transversal (direction `transversalDeg`), in the engine's sector order: sector k runs from the
 * k-th to the (k + 1)-th ray after sorting the four ray directions. Opposite sectors are equal.
 */
export function sectorWidths(lineDeg: number, transversalDeg: number): readonly [number, number, number, number] {
  const rays = [lineDeg, transversalDeg, lineDeg + 180, transversalDeg + 180].map(normalizeAngle).sort((a, b) => a - b);
  const width = (index: number) => normalizeAngle(rays[(index + 1) % 4]! - rays[index]!);
  return [width(0), width(1), width(2), width(3)];
}

export type AngleSize = 'acute' | 'obtuse';

/**
 * The sector that draws an angle of the given size (SPEC 10.3: a 68° angle is drawn acute, a
 * 112° angle obtuse). There are two such sectors — a vertical pair — and `which` picks one, so
 * pages can vary where the angle sits without touching sector indices by hand.
 */
export function sectorOfSize(lineDeg: number, transversalDeg: number, size: AngleSize, which: 0 | 1 = 0): Sector {
  const widths = sectorWidths(lineDeg, transversalDeg);
  if (Math.abs(widths[0] - 90) < 1) throw new Error(`A ${lineDeg}° / ${transversalDeg}° crossing is (almost) perpendicular: no acute or obtuse sector`);
  const matching = ([0, 1, 2, 3] as const).filter(sector => (size === 'acute' ? widths[sector] < 90 : widths[sector] > 90));
  return matching[which]!;
}

/**
 * All alternate-angle pairs for the two intersections of one transversal
 * with a pair of parallel lines. This includes the two interior and the two
 * exterior alternate pairs. With identical sector indexing at both
 * intersections, the alternate mate is the vertically opposite sector.
 */
export function alternatePairs(): AnglePair[] {
  return ([0, 1, 2, 3] as const).map(sector => [
    { intersection: 'top', sector },
    { intersection: 'bottom', sector: ((sector + 2) % 4) as Sector },
  ] as const);
}

export function alternatePairAny(seed: Sector = 0): AnglePair {
  return alternatePairs()[seed]!;
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

/**
 * Interior-only subset, retained for tasks that explicitly ask for
 * alternate-interior angles rather than the broader school term
 * "זוויות מתחלפות".
 */
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

/**
 * Co-interior ("one-sided", חד-צדדיות) pairs: the two interior angles on the SAME side of the
 * transversal — one at each crossing. Between parallel lines they are supplementary (sum 180°).
 * Same construction as alternateInteriorPairs, but the bottom mate is on the same side, not opposite.
 */
export function coInteriorPairs(lineDeg: number, transversalDeg: number): AnglePair[] {
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
    const mate = bottomInterior.find(bottom => Math.sign(cross(trans, vector(bottom.mid))) === topSide);
    if (mate) {
      pairs.push([
        { intersection: 'top', sector: top.sector },
        { intersection: 'bottom', sector: mate.sector },
      ]);
    }
  }
  return pairs;
}

/** A co-interior pair; `seed` picks one of the two, `from` orders which angle is first. */
export function coInteriorPair(lineDeg: number, transversalDeg: number, seed = 0, from: IntersectionName = 'top'): AnglePair {
  const pairs = coInteriorPairs(lineDeg, transversalDeg);
  if (pairs.length === 0) throw new Error('Could not derive co-interior angle pair');
  return startingAt(pairs[seed % pairs.length]!, from);
}

/**
 * An alternate-interior pair. `seed` picks one of the two pairs; the first angle sits on line
 * `from` (pages put the given angle first).
 */
export function alternatePair(lineDeg: number, transversalDeg: number, seed = 0, from: IntersectionName = 'top'): AnglePair {
  const pairs = alternateInteriorPairs(lineDeg, transversalDeg);
  if (pairs.length === 0) throw new Error('Could not derive alternate-interior angle pair');
  return startingAt(pairs[seed % pairs.length]!, from);
}

/** The alternate-interior pair whose angles have the given size (one pair is acute, the other obtuse). */
export function alternatePairOfSize(lineDeg: number, transversalDeg: number, size: AngleSize, from: IntersectionName = 'top'): AnglePair {
  const widths = sectorWidths(lineDeg, transversalDeg);
  const pair = alternateInteriorPairs(lineDeg, transversalDeg)
    .find(([top]) => (size === 'acute' ? widths[top.sector] < 90 : widths[top.sector] > 90));
  if (!pair) throw new Error(`No ${size} alternate-interior pair for ${lineDeg}° / ${transversalDeg}°`);
  return startingAt(pair, from);
}

/** The sector vertically opposite `sector` at the same crossing. */
export const verticalSector = (sector: Sector): Sector => ((sector + 2) % 4) as Sector;

/** A sector adjacent to `sector` at the same crossing (`turn` 1 or −1 picks the neighbour). */
export const adjacentSector = (sector: Sector, turn: 1 | -1 = 1): Sector => ((sector + turn + 4) % 4) as Sector;
