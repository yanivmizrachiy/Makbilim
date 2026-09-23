/**
 * Angle labels point at their own angle (SPEC 10.3), measured on every rendered two-line diagram of
 * units 1–4.
 *
 * A label is how the student finds "∠B" or "the 47° angle" in the drawing, so:
 * - its centre lies inside the sector of the angle it names — a label across a line from its arc
 *   names the neighbouring angle;
 * - its ink never covers a parallel chevron (the chevrons are the given "p ∥ q"), and no chevron
 *   touches an angle arc or crowds a crossing (a chevron on an arc reads as part of the angle mark);
 * - its text (glyph ink plus halo) never sits on a drawn line — no exceptions.
 *
 * The diagram parameters (orientation, transversal, which sector, which line holds the given) are
 * chosen so that these hold; a failure names the task whose parameters need another choice.
 */
import { describe, expect, it, vi } from 'vitest';
import { angleLabels, chevronCrossingGaps, chevronSegments, chevronTouchesArc, drawnSegments, type AngleLabelProbe } from './support/label-probe';
import { probeModule, renderBookletDiagrams } from './support/diagram-capture';
import { geometryTokens as T } from '../../src/styles/tokens';

const PX_PER_MM = 96 / 25.4;
/** A chevron stroke keeps at least this much clear of every angle arc (a visible gap at print size). */
const CHEVRON_ARC_CLEARANCE = 0.75 * PX_PER_MM;
/**
 * A chevron's centre keeps this far from every crossing: the crossing dot, half the chevron's own span,
 * and a visible 1.5 mm gap — so a chevron never crowds a vertex or reads as part of an angle mark.
 */
const CHEVRON_CROSSING_GAP = (T.dotRadiusMm + (T.chevron.lengthMm + T.chevron.pitchMm) / 2 + 1.5) * PX_PER_MM;

vi.mock('../../src/geometry/ParallelLinesDiagram', importOriginal => probeModule(importOriginal, 'ParallelLinesDiagram', 'parallel'));
vi.mock('../../src/geometry/ThreeLinesDiagram', importOriginal => probeModule(importOriginal, 'ThreeLinesDiagram', 'three'));

/**
 * Angle labels that still touch a drawn line, as "<task> <label>". The geometry engine now places
 * every angle label clear of every drawn line (it passes the lines and arcs to the placer), so the
 * ratchet is empty: any label on a line fails.
 */
const ENGINE_LABEL_ON_LINE: readonly string[] = [];

const diagrams = (await renderBookletDiagrams()).filter(d => d.kind === 'parallel' && d.unit >= 1 && d.unit <= 4);
const probes = diagrams.map(d => ({ task: d.taskId ?? `diagram #${d.index}`, svg: d.svg, labels: angleLabels(d.svg) }));
const key = (task: string, label: AngleLabelProbe) => `${task} ${label.text}`;
const offenders = (test: (label: AngleLabelProbe) => boolean) =>
  probes.flatMap(p => p.labels.filter(test).map(label => key(p.task, label)));

describe('angle labels point at their own angle (SPEC 10.3)', () => {
  it('reads every angle label, line and chevron of the booklet (self-check)', () => {
    // Every rendered angle label (numbering digits in arc-less index marks aside) is measured.
    const rendered = probes.reduce((sum, p) => sum + [...p.svg.matchAll(/<g class="(angle-mark[^"]*)"[^>]*>(?:(?!<g class="angle-mark)[\s\S])*?<text class="angle-label-text"/g)].filter(m => !m[1]!.includes('angle-mark--index')).length, 0);
    expect(rendered).toBeGreaterThan(100);
    expect(probes.flatMap(p => p.labels).length).toBe(rendered);
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
      '<text class="angle-label-text" x="200" y="150" text-anchor="middle" direction="ltr" data-label="A">𝐴</text></g>',
      // A label on the line, over the chevron, inside its sector (180°–225°).
      '<g class="angle-mark" data-angle-role="given" data-angle-at="top" data-angle-sector="2"><path class="angle-arc angle-arc--inner" d="M 171.11 97.47 A 29 29 0 0 1 177.78 81.36" />',
      '<text class="angle-label-text" x="60" y="100" text-anchor="middle" direction="ltr" data-label="B">𝐵</text></g>',
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

  it('no parallel chevron touches an angle arc, or crowds a crossing', () => {
    // The engine puts the chevrons at a fixed spot on each line, so a shallow crossing brings one
    // crossing close to them; diagrams with chevrons therefore keep crossings of about 53° or more.
    // 6 units ≈ the two stroke half-widths plus a visible gap at print size.
    expect(probes.filter(p => chevronTouchesArc(p.svg, CHEVRON_ARC_CLEARANCE)).map(p => p.task)).toEqual([]);
    const crowded = probes.flatMap(p => chevronCrossingGaps(p.svg).filter(gap => gap < CHEVRON_CROSSING_GAP).map(gap => `${p.task} (${gap.toFixed(1)})`));
    expect(crowded).toEqual([]);
  });

  it('no angle label sits on a drawn line', () => {
    const onLine = offenders(label => label.onLine);
    expect(onLine.filter(entry => !ENGINE_LABEL_ON_LINE.includes(entry))).toEqual([]);
    expect(onLine).toEqual([]);
  });
});
