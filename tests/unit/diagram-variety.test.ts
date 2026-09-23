/**
 * SPEC 10.1 / 10.2 — deliberate diagram variety, so that position is never a clue.
 *
 * Measured on every diagram of the rendered booklet (units 1–4), from the props the pages pass to
 * the engines and the SVG they draw:
 * - crossing angles (the acute angle between the parallel lines and the transversal) are spread
 *   over about 35°–78°, with real shallow and real steep crossings, and no 10° band dominates;
 * - the transversal leans both ways about equally often, also among near-horizontal layouts;
 * - no two diagrams on one page share a pose (orientation AND crossing angle within 6°), and no
 *   two diagrams in the booklet are the same drawing;
 * - in unit 2 the given angle sits on the bottom line about as often as on the top line;
 * - two transversals never meet a parallel line at (almost) the same point.
 * Acute / obtuse faithfulness of every value (SPEC 10.3) is checked by the independent verifier.
 */
import { describe, expect, it, vi } from 'vitest';
import type { AngleMark, ParallelLinesDiagramProps } from '../../src/geometry/ParallelLinesDiagram';
import { probeModule, renderBookletDiagrams, type BookletDiagram } from './support/diagram-capture';

vi.mock('../../src/geometry/ParallelLinesDiagram', importOriginal => probeModule(importOriginal, 'ParallelLinesDiagram', 'parallel'));
vi.mock('../../src/geometry/ThreeLinesDiagram', importOriginal => probeModule(importOriginal, 'ThreeLinesDiagram', 'three'));

const norm = (deg: number) => ((deg % 360) + 360) % 360;
/** Smallest difference between two undirected line directions. */
const lineGap = (a: number, b: number) => {
  const d = norm(a - b) % 180;
  return Math.min(d, 180 - d);
};

type Pose = { diagram: BookletDiagram; orientation: number; transversal: number; crossing: number; lean: '/' | '\\' };

function poseOf(diagram: BookletDiagram): Pose {
  const props = diagram.props as { orientationDeg?: number; transversalDeg?: number };
  const orientation = props.orientationDeg ?? 0;
  const transversal = props.transversalDeg ?? (diagram.kind === 'three' ? 61 : 62);
  // Angle from the lines to the transversal, turning the same way for every drawing: below 90° the
  // transversal leans one way relative to the lines ('\' for horizontal lines), above 90° the other.
  const relative = norm(transversal - orientation) % 180;
  return { diagram, orientation, transversal, crossing: lineGap(transversal, orientation), lean: relative > 90 ? '/' : '\\' };
}

const diagrams = (await renderBookletDiagrams()).filter(d => d.unit >= 1 && d.unit <= 4);
const poses = diagrams.map(poseOf);
const name = (pose: Pose) => `${pose.diagram.taskId} (u${pose.diagram.unit}-p${pose.diagram.page}, ${pose.orientation}°/${pose.transversal}°)`;
const share = (part: number, whole: number) => part / whole;

describe('diagram variety (SPEC 10.1 / 10.2)', () => {
  it('measures every diagram of units 1–4 (self-check)', () => {
    expect(poses.length).toBeGreaterThan(50);
    expect(lineGap(0, 58)).toBe(58);
    expect(lineGap(18, 258)).toBe(60);
    expect(poseOf({ ...diagrams[0]!, props: { orientationDeg: 0, transversalDeg: 58 } }).lean).toBe('\\');
    expect(poseOf({ ...diagrams[0]!, props: { orientationDeg: 0, transversalDeg: 122 } }).lean).toBe('/');
  });

  it('crossing angles stay within 35°–80° (no near-parallel or near-perpendicular transversal)', () => {
    const outside = poses.filter(pose => pose.crossing < 35 || pose.crossing > 80).map(name);
    expect(outside).toEqual([]);
  });

  it('crossing angles include shallow (35°–44°) and steep (68°–78°) ones — at least 4 of each', () => {
    expect(poses.filter(pose => pose.crossing >= 35 && pose.crossing < 45).length).toBeGreaterThanOrEqual(4);
    expect(poses.filter(pose => pose.crossing >= 68 && pose.crossing <= 78).length).toBeGreaterThanOrEqual(4);
  });

  it('no 10° band of crossing angles holds more than 35% of the diagrams', () => {
    const bands = new Map<number, number>();
    for (const pose of poses) {
      const band = Math.floor((pose.crossing - 35) / 10);
      bands.set(band, (bands.get(band) ?? 0) + 1);
    }
    for (const [band, count] of bands) {
      expect(share(count, poses.length), `${35 + 10 * band}°–${44 + 10 * band}°: ${count} of ${poses.length}`).toBeLessThanOrEqual(0.35);
    }
  });

  it('the transversal leans each way in 40%–60% of the diagrams, and of the near-horizontal ones', () => {
    const slash = poses.filter(pose => pose.lean === '/').length;
    expect(share(slash, poses.length)).toBeGreaterThanOrEqual(0.4);
    expect(share(slash, poses.length)).toBeLessThanOrEqual(0.6);
    const flat = poses.filter(pose => lineGap(pose.orientation, 0) <= 25);
    const flatSlash = flat.filter(pose => pose.lean === '/').length;
    expect(flat.length).toBeGreaterThan(20);
    expect(share(flatSlash, flat.length)).toBeGreaterThanOrEqual(0.4);
    expect(share(flatSlash, flat.length)).toBeLessThanOrEqual(0.6);
  });

  it('no two diagrams on one page share a pose (orientation and crossing angle both within 6°)', () => {
    const clashes: string[] = [];
    poses.forEach((a, i) => poses.slice(i + 1).forEach(b => {
      if (a.diagram.unit !== b.diagram.unit || a.diagram.page !== b.diagram.page) return;
      if (lineGap(a.orientation, b.orientation) <= 6 && Math.abs(a.crossing - b.crossing) <= 6) clashes.push(`${name(a)} ~ ${name(b)}`);
    }));
    expect(clashes).toEqual([]);
  });

  it('no drawing is repeated anywhere in the booklet (same lines and same transversal, within 2°)', () => {
    const repeats: string[] = [];
    poses.forEach((a, i) => poses.slice(i + 1).forEach(b => {
      if (lineGap(a.orientation, b.orientation) <= 2 && lineGap(a.transversal, b.transversal) <= 2) repeats.push(`${name(a)} = ${name(b)}`);
    }));
    expect(repeats).toEqual([]);
  });

  it('unit 2: the given angle is on the bottom line in 40%–60% of the tasks (not always on top)', () => {
    const lineOfGiven = diagrams
      .filter(d => d.unit === 2 && d.kind === 'parallel')
      .map(d => {
        const main = ((d.props as ParallelLinesDiagramProps).angleMarks ?? [])
          .filter((mark: AngleMark) => mark.role === 'given' && (mark.intersection === 'top' || mark.intersection === 'bottom'))
          .map(mark => mark.intersection);
        return { task: d.taskId, lines: [...new Set(main)] };
      })
      // Algebra pairs give both angles; only tasks whose given sits on ONE line say where the given is.
      .filter(entry => entry.lines.length === 1);
    expect(lineOfGiven.length).toBeGreaterThanOrEqual(12);
    const bottom = lineOfGiven.filter(entry => entry.lines[0] === 'bottom').length;
    expect(share(bottom, lineOfGiven.length), `given on the bottom line in ${bottom} of ${lineOfGiven.length}`).toBeGreaterThanOrEqual(0.4);
    expect(share(bottom, lineOfGiven.length), `given on the bottom line in ${bottom} of ${lineOfGiven.length}`).toBeLessThanOrEqual(0.6);
  });

  it('two transversals meet each parallel line well apart (at least 0.45 × the distance between the lines)', () => {
    const twoTransversals = diagrams.filter(d => d.kind === 'parallel' && (d.props as ParallelLinesDiagramProps).secondaryTransversalDeg != null);
    expect(twoTransversals.length).toBeGreaterThanOrEqual(8);
    for (const d of twoTransversals) {
      const dots = [...d.svg.matchAll(/<circle cx="([^"]+)" cy="([^"]+)"/g)].map(m => ({ x: Number(m[1]), y: Number(m[2]) }));
      expect(dots, `${d.taskId}: four crossings`).toHaveLength(4);
      const [top, bottom, topSecondary, bottomSecondary] = dots as [typeof dots[0], typeof dots[0], typeof dots[0], typeof dots[0]];
      const line = /<g class="geometry-lines"><line x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)"/.exec(d.svg)!;
      const [x1, y1, x2, y2] = [1, 2, 3, 4].map(i => Number(line[i]));
      const gap = Math.abs((x2! - x1!) * (bottom.y - y1!) - (y2! - y1!) * (bottom.x - x1!)) / Math.hypot(x2! - x1!, y2! - y1!);
      const apart = (p: typeof top, q: typeof top) => Math.hypot(p.x - q.x, p.y - q.y) / gap;
      expect(apart(top, topSecondary), `${d.taskId}: crossings on the first line`).toBeGreaterThanOrEqual(0.45);
      expect(apart(bottom, bottomSecondary), `${d.taskId}: crossings on the second line`).toBeGreaterThanOrEqual(0.45);
    }
  });
});
