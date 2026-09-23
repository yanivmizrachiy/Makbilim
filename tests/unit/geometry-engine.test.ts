import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import App from '../../src/App';
import { taskKindById } from '../../src/content/task-kinds';
import { diagramSizeFor } from '../../src/geometry/diagram-size';
import { arcTrimDeg, mm, probeLayout, pt } from '../../src/geometry/engine';
import { shapeLabel } from '../../src/geometry/label-font';
import { buildFigure, ParallelLinesDiagram } from '../../src/geometry/ParallelLinesDiagram';
import { geometryTokens as T, type DiagramSize } from '../../src/styles/tokens';

/*
 * The geometry engine's invariants, measured on the rendered booklet:
 * fixed physical scale (E1), figures fitted to and filling their box (E2), textbook labels off
 * every line and arc and inside their own angle (E3), arc forms (E4), solid dots (E5),
 * numbering diagrams without bullseye rings (E7), and CSS variables mirroring the tokens (E8).
 */

const css = fs.readFileSync(path.join(process.cwd(), 'src/styles/geometry-premium.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
/** Every @font-face of the booklet lives in fonts.css (offline, bundled). */
const fontsCss = fs.readFileSync(path.join(process.cwd(), 'src/styles/fonts.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const html = renderToStaticMarkup(createElement(App));
const sections = html.split('<section ').slice(1);

type Pt = { x: number; y: number };
type Box = { left: number; top: number; right: number; bottom: number };
const num = (value: string | undefined) => Number(value ?? Number.NaN);
const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];
const decode = (text: string) => text.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&');

type Diagram = { task: string; svg: string; open: string };
const diagrams: Diagram[] = sections.flatMap(section => {
  const task = /data-task-id="([^"]+)"/.exec(section)?.[1] ?? '';
  return [...section.matchAll(/<svg class="geometry-diagram[\s\S]*?<\/svg>/g)].map(m => ({
    task,
    svg: m[0],
    open: /<svg[^>]*>/.exec(m[0])![0],
  }));
});

type Label = { kind: string; text: string; x: number; baseline: number; fontPx: number; group: string };
function labelsOf(svg: string): Label[] {
  return [...svg.matchAll(/<text class="([^"]+)" x="([^"]+)" y="([^"]+)"[^>]*data-label="([^"]*)"/g)].map(m => {
    const kind = m[1]!;
    const fontPt = kind.includes('--index') ? T.label.indexPt : kind === 'line-label-text' ? T.label.linePt : T.label.anglePt;
    return { kind, text: decode(m[4]!), x: num(m[2]), baseline: num(m[3]), fontPx: pt(fontPt), group: '' };
  });
}

/** Ink (with halo) and em boxes of a rendered label, from the label face's metrics. */
function boxes(label: Label): { ink: Box; em: Box } {
  const shaped = shapeLabel(label.text);
  const halo = mm(T.label.haloMm) / 2;
  const half = (shaped.width / 2) * label.fontPx;
  return {
    ink: { left: label.x - half - halo, right: label.x + half + halo, top: label.baseline - shaped.yMax * label.fontPx - halo, bottom: label.baseline - shaped.yMin * label.fontPx + halo },
    em: { left: label.x - half, right: label.x + half, top: label.baseline - 0.806 * label.fontPx, bottom: label.baseline + 0.194 * label.fontPx },
  };
}

type Arc = { start: Pt; end: Pt; radius: number; large: boolean; centre: Pt };
function arcsOf(svg: string): Arc[] {
  return [...svg.matchAll(/class="angle-arc angle-arc--(?:inner|outer)" d="M (\S+) (\S+) A (\S+) \S+ 0 ([01]) 1 (\S+) (\S+)"/g)].map(m => {
    const start = { x: num(m[1]), y: num(m[2]) };
    const end = { x: num(m[5]), y: num(m[6]) };
    const radius = num(m[3]);
    const large = m[4] === '1';
    const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    const chord = { x: end.x - start.x, y: end.y - start.y };
    const half = Math.hypot(chord.x, chord.y) / 2;
    const d = Math.sqrt(Math.max(0, radius * radius - half * half));
    const n = { x: chord.y / (2 * half), y: -chord.x / (2 * half) };
    const sign = large ? -1 : 1;
    return { start, end, radius, large, centre: { x: mid.x - sign * n.x * d, y: mid.y - sign * n.y * d } };
  });
}

const dirDeg = (from: Pt, to: Pt) => ((Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI + 360) % 360;
const inSweep = (deg: number, start: number, sweep: number) => ((deg - start + 720) % 360) <= sweep;
const overlap = (a: Box, b: Box) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);

/** Distance from a box to an arc (sampled every degree). */
function boxToArc(box: Box, arc: Arc) {
  const a0 = dirDeg(arc.centre, arc.start);
  const sweep = (dirDeg(arc.centre, arc.end) - a0 + 360) % 360;
  let best = Infinity;
  for (let i = 0; i <= Math.ceil(sweep); i += 1) {
    const deg = ((a0 + Math.min(i, sweep)) * Math.PI) / 180;
    const p = { x: arc.centre.x + arc.radius * Math.cos(deg), y: arc.centre.y + arc.radius * Math.sin(deg) };
    const dx = Math.max(box.left - p.x, 0, p.x - box.right);
    const dy = Math.max(box.top - p.y, 0, p.y - box.bottom);
    best = Math.min(best, Math.hypot(dx, dy));
  }
  return best;
}

describe('geometry engine — fixed physical scale (E1)', () => {
  it('mirrors every CSS-facing token as a --geo-* custom property', () => {
    const value = (name: string) => new RegExp(`${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim();
    expect(value('--geo-stroke-line')).toBe(`${T.stroke.lineMm}mm`);
    expect(value('--geo-stroke-arc')).toBe(`${T.stroke.arcMm}mm`);
    expect(value('--geo-stroke-arc-aux')).toBe(`${T.stroke.arcAuxMm}mm`);
    expect(value('--geo-stroke-chevron')).toBe(`${T.stroke.chevronMm}mm`);
    expect(value('--geo-stroke-leader')).toBe(`${T.stroke.leaderMm}mm`);
    expect(value('--geo-halo-width')).toBe(`${T.label.haloMm}mm`);
    expect(value('--geo-dash-aux')).toBe(T.dashAuxMm.map(v => `${v}mm`).join(' '));
    expect(value('--geo-label-size')).toBe(`${T.label.anglePt}pt`);
    expect(value('--geo-line-label-size')).toBe(`${T.label.linePt}pt`);
    expect(value('--geo-index-label-size')).toBe(`${T.label.indexPt}pt`);
  });

  it('prints every label at 8.5 pt or more, in every size class (labels never scale with the slot)', () => {
    for (const size of [T.label.anglePt, T.label.linePt, T.label.indexPt]) expect(size).toBeGreaterThanOrEqual(T.label.minPt);
    expect(T.label.minPt).toBeGreaterThanOrEqual(8.5);
    for (const { open } of diagrams) {
      const [, , w, h] = attr(open, 'viewBox')!.split(' ').map(Number);
      // Rendered at intrinsic size: 1 user unit = 1 CSS px, so a 9.5pt label prints at 9.5pt.
      expect(num(attr(open, 'width'))).toBe(w);
      expect(num(attr(open, 'height'))).toBe(h);
    }
  });

  it('chooses the size class from data: identification → mark, tables and pairs their own class', () => {
    expect(diagrams.length).toBeGreaterThan(55);
    for (const { task, open, svg } of diagrams) {
      const size = attr(open, 'data-diagram-size') as DiagramSize;
      const inTable = sections.find(s => s.includes(svg))?.includes('relation-table') && size === 'table';
      const inPair = size === 'pair' || size === 'densePair';
      if (inTable || inPair) continue;
      const compact = true;
      expect(size, task).toBe(diagramSizeFor({ taskId: task, kind: taskKindById(task), compact }));
    }
    const sizes = new Set(diagrams.map(d => attr(d.open, 'data-diagram-size')));
    for (const size of ['mark', 'markLarge', 'compact', 'dense', 'pair', 'densePair', 'table']) expect(sizes.has(size)).toBe(true);
  });
});

describe('geometry engine — figures fitted to their box (E2)', () => {
  it.each(diagrams.map((d, i) => [`${d.task} #${i + 1}`, d] as const))('%s fits its size class at a scale ≥ the minimum, every label placed', (_, { open }) => {
    const size = T.size[attr(open, 'data-diagram-size') as DiagramSize];
    expect(attr(open, 'data-label-fit')).toBe('complete');
    expect(num(attr(open, 'data-geometry-scale'))).toBeGreaterThanOrEqual(T.minGeometryScale);
    expect(num(attr(open, 'width'))).toBeLessThanOrEqual(mm(size.maxWidthMm) + 0.01);
    expect(num(attr(open, 'height'))).toBeLessThanOrEqual(mm(size.heightMm) + 0.01);
  });

  it('fills the box: every figure reaches the box in at least one dimension (within 1.5 mm)', () => {
    const loose = diagrams.filter(({ open }) => {
      const size = T.size[attr(open, 'data-diagram-size') as DiagramSize];
      const scale = num(attr(open, 'data-geometry-scale'));
      const reachesBox = mm(size.maxWidthMm) - num(attr(open, 'width')) < mm(1.5) || mm(size.heightMm) - num(attr(open, 'height')) < mm(1.5);
      return !reachesBox && scale < size.maxScale - 1e-3;
    });
    expect(loose.map(d => d.task)).toEqual([]);
  });

  it('keeps every drawn label inside the fitted viewBox', () => {
    const outside = diagrams.flatMap(({ task, open, svg }) => {
      const [x, y, w, h] = attr(open, 'viewBox')!.split(' ').map(Number) as [number, number, number, number];
      return labelsOf(svg).filter(label => {
        const { ink, em } = boxes(label);
        return [ink, em].some(b => b.left < x - 0.01 || b.top < y - 0.01 || b.right > x + w + 0.01 || b.bottom > y + h + 0.01);
      }).map(label => `${task}: "${label.text}"`);
    });
    expect(outside).toEqual([]);
  });

  it('ends transversals a fixed overhang past their outermost crossing (not a fixed length)', () => {
    const svg = renderToStaticMarkup(createElement(ParallelLinesDiagram, { orientationDeg: 0, transversalDeg: 60 }));
    const lines = [...svg.matchAll(/<line x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)"/g)].map(m => ({ a: { x: num(m[1]), y: num(m[2]) }, b: { x: num(m[3]), y: num(m[4]) } }));
    const dots = [...svg.matchAll(/<circle cx="([^"]+)" cy="([^"]+)"/g)].map(m => ({ x: num(m[1]), y: num(m[2]) }));
    const transversal = lines[2]!;
    const overhangs = [transversal.a, transversal.b].map(end => Math.min(...dots.map(d => Math.hypot(d.x - end.x, d.y - end.y))));
    for (const overhang of overhangs) expect(overhang).toBeCloseTo(mm(T.transversalOverhangMm), 3);
  });

  it('is deterministic: the same figure lays out byte-identically', () => {
    const input = { lineLabels: ['p', 'q'] as [string, string], transversalLabel: 't', secondaryTransversalLabel: 's', orientationDeg: 8, transversalDeg: 64, secondaryTransversalDeg: 118, secondLineSkewDeg: 0, showParallelMarks: true, angleMarks: [{ intersection: 'top' as const, sector: 0 as const, value: '(4x + 6)°' }] };
    const once = JSON.stringify(probeLayout(buildFigure(mm(17), input), 'compact', mm(17), mm(10)));
    const twice = JSON.stringify(probeLayout(buildFigure(mm(17), input), 'compact', mm(17), mm(10)));
    expect(twice).toBe(once);
  });
});

describe('geometry engine — textbook labels (E3)', () => {
  it('keeps labels apart from each other (em boxes never overlap)', () => {
    const clashes = diagrams.flatMap(({ task, svg }) => {
      const all = labelsOf(svg).map(label => ({ label, box: boxes(label).em }));
      return all.flatMap((a, i) => all.slice(i + 1).filter(b => overlap(a.box, b.box)).map(b => `${task}: "${a.label.text}" / "${b.label.text}"`));
    });
    expect(clashes).toEqual([]);
  });

  it('keeps every label off every arc (arcs are obstacles for line names too)', () => {
    const clearance = mm(T.placement.lineClearanceMm) - 0.1;
    const touching = diagrams.flatMap(({ task, svg }) => {
      const arcs = arcsOf(svg);
      return labelsOf(svg).filter(label => arcs.some(arc => boxToArc(boxes(label).ink, arc) < clearance)).map(label => `${task}: "${label.text}"`);
    });
    expect(touching).toEqual([]);
  });

  it('puts every angle label inside its own angle, next to its arc or joined to it by a leader', () => {
    const astray = diagrams.flatMap(({ task, svg }) => svg.split('<g class="angle-mark ').slice(1).flatMap(chunk => {
      const labelMatch = /<text class="angle-label-text[^"]*" x="([^"]+)" y="([^"]+)"[^>]*data-label="([^"]*)"/.exec(chunk);
      const arc = arcsOf(chunk)[0];
      if (!labelMatch || !arc) return [];
      const label: Label = { kind: 'angle', text: decode(labelMatch[3]!), x: num(labelMatch[1]), baseline: num(labelMatch[2]), fontPx: pt(T.label.anglePt), group: '' };
      const { ink } = boxes(label);
      const centre = { x: (ink.left + ink.right) / 2, y: (ink.top + ink.bottom) / 2 };
      const trim = arcTrimDeg(arc.radius);
      const start = dirDeg(arc.centre, arc.start) - trim;
      const sweep = ((dirDeg(arc.centre, arc.end) + trim - start) + 360) % 360;
      const inside = inSweep(dirDeg(arc.centre, centre), start, sweep);
      const near = boxToArc(ink, arc) <= mm(T.placement.maxBeyondArcMm + T.arc.doubleGapMm + 0.5);
      const leader = chunk.includes('class="angle-leader"');
      return inside && (near || leader) ? [] : [`${task}: "${label.text}" inside=${inside} near=${near}`];
    }));
    expect(astray).toEqual([]);
  });

  it('draws labels in the question text face: math italic letters, upright digits', () => {
    expect(shapeLabel('A').runs[0]!.text).toBe('𝐴');
    expect(shapeLabel('α').runs[0]!.text).toBe('𝛼');
    expect(shapeLabel('68°').runs[0]!.text).toBe('68°');
    expect(shapeLabel('(4x + 6)°').runs[0]!.text).toBe('(4𝑥 + 6)°');
    expect(shapeLabel('ℓ₁').runs).toEqual([{ text: 'ℓ', sub: false }, { text: '1', sub: true }]);
    // Hebrew words are text: spaces kept, set right to left (never shaped as mathematics).
    expect(shapeLabel('מסילה 1')).toMatchObject({ rtl: true, runs: [{ text: 'מסילה 1', sub: false }] });
    expect(shapeLabel('A').rtl).toBe(false);
    const hebrew = diagrams.flatMap(({ svg }) => [...svg.matchAll(/<text [^>]*direction="rtl"[^>]*data-label="([^"]*)"/g)].map(m => m[1]));
    expect(hebrew).toContain('מסילה 1');
    expect(fontsCss).toMatch(/font-family:\s*"Makbilim Math";\s*src:\s*url\("@mathjax\/mathjax-newcm-font\/chtml\/woff2\/mjx-ncm-n\.woff2"\)/);
    expect(css).toMatch(/font-family:\s*"Makbilim Math"/);
    for (const sheet of [css, fontsCss]) expect(sheet).not.toMatch(/https?:\/\//);
  });
});

describe('geometry engine — arcs, dots, numbering (E4, E5, E7)', () => {
  it('draws double arcs visibly double: 1.0 mm apart', () => {
    const doubles = diagrams.flatMap(({ svg }) => svg.split('<g class="angle-mark ').slice(1).filter(chunk => chunk.includes('angle-arc--outer')));
    expect(doubles.length).toBeGreaterThan(5);
    for (const chunk of doubles) {
      const [inner, outer] = arcsOf(chunk);
      expect(outer!.radius - inner!.radius).toBeCloseTo(mm(T.arc.doubleGapMm), 2);
      expect(Math.hypot(inner!.centre.x - outer!.centre.x, inner!.centre.y - outer!.centre.y)).toBeLessThan(0.02);
    }
  });

  it('gives acute angles a larger arc so their label fits', () => {
    const svg = renderToStaticMarkup(createElement(ParallelLinesDiagram, { orientationDeg: 0, transversalDeg: 30, angleMarks: [{ intersection: 'top', sector: 0, label: 'A' }, { intersection: 'top', sector: 1, label: 'B' }] }));
    const [acute, obtuse] = arcsOf(svg);
    expect(acute!.radius).toBeCloseTo(mm(T.arc.radiusMm + T.arc.acuteBoostMm), 2);
    expect(obtuse!.radius).toBeCloseTo(mm(T.arc.radiusMm), 2);
  });

  it('draws solid crossing dots of the token radius', () => {
    for (const { svg } of diagrams) {
      for (const m of svg.matchAll(/<circle [^>]*r="([^"]+)"/g)) expect(num(m[1])).toBeCloseTo(mm(T.dotRadiusMm), 2);
    }
  });

  it('numbers all eight angles of the numbering diagrams in their openings, with no arc rings', () => {
    // The three matching figures (U1-P1-E, U1-P2-A, U1-P2-B) and the eight-angles figure U1-P5-B.
    const numbering = diagrams.filter(({ svg }) => svg.includes('angle-label-text--index'));
    expect(numbering.length).toBe(4);
    for (const { svg } of numbering) {
      expect(labelsOf(svg).filter(label => label.kind.includes('--index')).map(label => label.text).sort()).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
      expect(svg).not.toContain('angle-arc');
    }
  });
});

describe('geometry engine — colours as variables (E8)', () => {
  const block = (media: string) => {
    const start = css.indexOf(media);
    return start < 0 ? '' : css.slice(start, css.indexOf('\n}', start));
  };
  it('maps every geometry colour for grayscale print and for forced colours', () => {
    for (const name of ['--geo-given', '--geo-marked', '--geo-target', '--geo-aux']) expect(block('@media print and (monochrome)')).toContain(name);
    const forced = block('@media (forced-colors: active)');
    for (const name of ['--geo-ink', '--geo-given', '--geo-marked', '--geo-target', '--geo-aux']) expect(forced).toMatch(new RegExp(`${name}:\\s*CanvasText`));
    expect(forced).toMatch(/--geo-halo:\s*Canvas;/);
    // No hard-coded colour outside the variable definitions: every painted property reads a variable.
    const painted = [...css.matchAll(/(?:^|[;{\s])(fill|stroke):\s*([^;]+);/g)].map(m => m[2]!.trim());
    for (const paint of painted) expect(paint === 'none' || paint.startsWith('var(--')).toBe(true);
  });
});
