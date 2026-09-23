/**
 * Angle labels point at their own angle (SPEC 10.3), measured on every rendered two-line diagram of
 * units 1–4.
 *
 * A label is how the student finds "∠B" or "the 47° angle" in the drawing, so:
 * - its centre lies inside the sector of the angle it names — a label across a line from its arc
 *   names the neighbouring angle;
 * - its plate never covers a parallel chevron (the chevrons are the given "p ∥ q"), and no chevron
 *   touches an angle arc or crowds a crossing (a chevron on an arc reads as part of the angle mark);
 * - its text never sits on a drawn line. The engine does not yet steer angle labels away from lines,
 *   so the cases it still produces are pinned below by task and label. This is a ratchet: any other
 *   label on a line fails, and the list may only shrink (the engine stream owns emptying it).
 *
 * The diagram parameters (orientation, transversal, which sector, which line holds the given) are
 * chosen so that these hold; a failure names the task whose parameters need another choice.
 */
import { describe, expect, it, vi } from 'vitest';
import { angleLabels, chevronCrossingGaps, chevronSegments, chevronTouchesArc, drawnSegments, type AngleLabelProbe } from './support/label-probe';
import { probeModule, renderBookletDiagrams } from './support/diagram-capture';

vi.mock('../../src/geometry/ParallelLinesDiagram', importOriginal => probeModule(importOriginal, 'ParallelLinesDiagram', 'parallel'));
vi.mock('../../src/geometry/ThreeLinesDiagram', importOriginal => probeModule(importOriginal, 'ThreeLinesDiagram', 'three'));

/**
 * Angle labels that still touch a drawn line, as "<task> <label>". Every entry is a long algebraic
 * expression: at the engine's label radius its text is wider than an acute sector, so no choice of
 * parameters clears it while the engine places angle labels without avoiding lines (U2-P5-C's
 * obtuse (2y + 18)° is boxed in by its second transversal, which must stay well apart from the
 * first). Every obtuse expression elsewhere, and every letter, value and '?', is clear. Before the
 * parameters were chosen against this test, 22 labels sat on a line. The engine stream removes these
 * entries; nothing may be added.
 */
const ENGINE_LABEL_ON_LINE: readonly string[] = [
  'U2-P4-A (4x + 6)°',
  'U2-P4-A (2x + 38)°',
  'U2-P4-B (3x + 17)°',
  'U2-P4-B (5x − 21)°',
  'U2-P4-D (2x + 35)°',
  'U2-P4-D (5x − 19)°',
  'U2-P5-C (3x + 12)°',
  'U2-P5-C (2y + 18)°',
  'U2-P5-D (2x + 20)°',
  'U4-P2-C (3x + 14)°',
];

const diagrams = (await renderBookletDiagrams()).filter(d => d.kind === 'parallel' && d.unit >= 1 && d.unit <= 4);
const probes = diagrams.map(d => ({ task: d.taskId ?? `diagram #${d.index}`, svg: d.svg, labels: angleLabels(d.svg) }));
const key = (task: string, label: AngleLabelProbe) => `${task} ${label.text}`;
const offenders = (test: (label: AngleLabelProbe) => boolean) =>
  probes.flatMap(p => p.labels.filter(test).map(label => key(p.task, label)));

describe('angle labels point at their own angle (SPEC 10.3)', () => {
  it('reads every angle label, line and chevron of the booklet (self-check)', () => {
    expect(probes.flatMap(p => p.labels).length).toBeGreaterThan(120);
    expect(probes.every(p => drawnSegments(p.svg).length >= 3)).toBe(true);
    const chevrons = probes.map(p => chevronSegments(p.svg).length);
    expect(chevrons.filter(count => count > 0).length).toBeGreaterThan(30);
    // Two chevrons (two polylines of two strokes each) on each of the two parallel lines.
    expect(chevrons.every(count => count === 0 || count === 8)).toBe(true);
  });

  it('detects a label outside its sector, on a line, and over a chevron (self-check of the measurement)', () => {
    const svg = [
      '<g class="geometry-lines"><line x1="0" y1="100" x2="400" y2="100" /><line x1="100" y1="0" x2="300" y2="200" /></g>',
      '<g class="parallel-mark parallel-mark--chevrons" transform="translate(60.00 100.00) rotate(0)" aria-hidden="true"><polyline points="-10,-6 -2,0 -10,6" /><polyline points="2,-6 10,0 2,6" /></g>',
      '<g class="geometry-intersections" aria-hidden="true"><circle cx="200" cy="100" r="2.55" /></g>',
      // Sector from 0° to 45° (below the line, right of the transversal); the label sits at 90°, on the far side of the transversal.
      '<g class="angle-mark" data-angle-role="given" data-angle-at="top" data-angle-sector="0"><path class="angle-arc angle-arc--inner" d="M 228.89 102.53 A 29 29 0 0 1 222.22 118.64" />',
      '<g class="angle-label-plate" aria-hidden="true"><rect x="186" y="136.5" width="28" height="27" rx="7" ry="7" /></g><text class="angle-label-text" x="200" y="150">A</text></g>',
      // A label on the line, over the chevron, inside its sector (180°–225°).
      '<g class="angle-mark" data-angle-role="given" data-angle-at="top" data-angle-sector="2"><path class="angle-arc angle-arc--inner" d="M 171.11 97.47 A 29 29 0 0 1 177.78 81.36" />',
      '<g class="angle-label-plate" aria-hidden="true"><rect x="46" y="86.5" width="28" height="27" rx="7" ry="7" /></g><text class="angle-label-text" x="60" y="100">B</text></g>',
    ].join('');
    const [a, b] = angleLabels(svg);
    expect(a).toMatchObject({ text: 'A', insideSector: false, onLine: false, coversChevron: false });
    expect(b).toMatchObject({ text: 'B', onLine: true, coversChevron: true });
    // The chevron at (60, 100) is 140 units from the crossing and clear of both arcs; moved to
    // (175, 100) it sits 25 units from the crossing, on the radius-29 arc of sector 2.
    expect(chevronCrossingGaps(svg)).toEqual([140]);
    expect(chevronTouchesArc(svg)).toBe(false);
    const near = svg.replace('translate(60.00 100.00)', 'translate(175.00 100.00)');
    expect(chevronCrossingGaps(near)).toEqual([25]);
    expect(chevronTouchesArc(near)).toBe(true);
  });

  it('every angle label lies inside the sector of the angle it names', () => {
    expect(offenders(label => !label.insideSector)).toEqual([]);
  });

  it('no angle label plate covers a parallel chevron', () => {
    expect(offenders(label => label.coversChevron)).toEqual([]);
  });

  it('no parallel chevron touches an angle arc, or sits within 36 units of a crossing', () => {
    // The engine puts the chevrons at a fixed spot on each line, so a shallow crossing brings one
    // crossing close to them; diagrams with chevrons therefore keep crossings of about 53° or more.
    // 6 units ≈ the two stroke half-widths plus a visible gap at print size.
    expect(probes.filter(p => chevronTouchesArc(p.svg, 6)).map(p => p.task)).toEqual([]);
    const crowded = probes.flatMap(p => chevronCrossingGaps(p.svg).filter(gap => gap < 36).map(gap => `${p.task} (${gap.toFixed(1)})`));
    expect(crowded).toEqual([]);
  });

  it('no angle label sits on a drawn line, apart from the pinned engine cases (ratchet)', () => {
    const onLine = offenders(label => label.onLine);
    expect(onLine.filter(entry => !ENGINE_LABEL_ON_LINE.includes(entry))).toEqual([]);
    expect(onLine.length).toBeLessThanOrEqual(ENGINE_LABEL_ON_LINE.length);
    // Only algebraic expressions may be pinned: a letter, a number or '?' always fits its sector.
    expect(ENGINE_LABEL_ON_LINE.filter(entry => !/\([^()]*[xy][^()]*\)°$/.test(entry))).toEqual([]);
  });
});
