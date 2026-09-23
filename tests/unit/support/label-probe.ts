/**
 * Test support: read the angle labels of one rendered two-line diagram (ParallelLinesDiagram SVG)
 * and measure where each one sits relative to its own angle, the drawn lines and the parallel
 * chevrons. Everything is read from the SVG markup the student sees.
 */
import { estimateLabelRect, LABEL_INK_BOX, segmentNearRect, type Point, type Rect, type Segment } from '../../../src/geometry/core';

const num = (value: string | undefined) => Number(value ?? Number.NaN);
const decode = (text: string) =>
  text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&');
const norm = (rad: number) => ((rad % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
const DEG = Math.PI / 180;
/**
 * A label counts as on a line when a line passes within this distance of its estimated ink box —
 * a little margin, because the estimate is tighter than the rendered glyphs and their halo.
 */
const ON_LINE_CLEARANCE = 2;

export type AngleLabelProbe = {
  text: string;
  /** The crossing the mark sits at (top / bottom / top-secondary / bottom-secondary). */
  at: string;
  point: Point;
  /** The white plate drawn behind the label. */
  plate: Rect;
  /** The label's centre lies within the angular sweep of its own arc. */
  insideSector: boolean;
  /** The label's text (ink box, as the engine estimates it) touches a drawn line. */
  onLine: boolean;
  /** The label's plate covers a stroke of a parallel chevron. */
  coversChevron: boolean;
};

/** The drawn lines of a diagram (parallel lines and transversals). */
export function drawnSegments(svg: string): Segment[] {
  const group = /<g class="geometry-lines">([\s\S]*?)<\/g>/.exec(svg)?.[1] ?? '';
  return [...group.matchAll(/<line x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)"/g)]
    .map(m => ({ a: { x: num(m[1]), y: num(m[2]) }, b: { x: num(m[3]), y: num(m[4]) } }));
}

/** The chevron strokes, as segments in diagram coordinates. */
export function chevronSegments(svg: string): Segment[] {
  return [...svg.matchAll(/<g class="parallel-mark[^"]*" transform="translate\(([^ ]+) ([^)]+)\) rotate\(([^)]+)\)"[^>]*>([\s\S]*?)<\/g>/g)]
    .flatMap(m => {
      const [tx, ty, rot] = [num(m[1]), num(m[2]), num(m[3]) * DEG];
      const place = ([x, y]: [number, number]): Point => ({ x: tx + x * Math.cos(rot) - y * Math.sin(rot), y: ty + x * Math.sin(rot) + y * Math.cos(rot) });
      return [...m[4]!.matchAll(/points="([^"]+)"/g)].flatMap(p => {
        const pts = p[1]!.trim().split(/\s+/).map(pair => place(pair.split(',').map(Number) as [number, number]));
        return pts.slice(1).map((b, i) => ({ a: pts[i]!, b }));
      });
    });
}

/** The engine draws the crossing dots in this order. */
const CROSSING_ORDER = ['top', 'bottom', 'top-secondary', 'bottom-secondary'] as const;

/** Every angle label of one ParallelLinesDiagram SVG, measured. */
export function angleLabels(svg: string): AngleLabelProbe[] {
  const lines = drawnSegments(svg);
  const chevrons = chevronSegments(svg);
  const crossings = [...svg.matchAll(/<circle cx="([^"]+)" cy="([^"]+)"/g)].map(m => ({ x: num(m[1]), y: num(m[2]) }));
  // One chunk per mark group: from its opening tag to the next mark group (or the end).
  const starts = [...svg.matchAll(/<g class="[^"]*" data-angle-role="[^"]*" data-angle-at="([^"]+)" data-angle-sector="\d">/g)];
  return starts
    .map((m, i) => ({ at: m[1]!, body: svg.slice(m.index + m[0].length, starts[i + 1]?.index ?? svg.length) }))
    .filter(group => group.body.includes('class="angle-label-text"'))
    .map(({ at, body }) => {
      const text = /<text class="angle-label-text" x="([^"]+)" y="([^"]+)"[^>]*>([^<]*)<\/text>/.exec(body);
      const plate = /<rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/.exec(body);
      const arc = /class="angle-arc angle-arc--inner" d="M ([^ ]+) ([^ ]+) A [^ ]+ [^ ]+ 0 [01] 1 ([^ ]+) ([^"]+)"/.exec(body);
      const centre = crossings[CROSSING_ORDER.indexOf(at as (typeof CROSSING_ORDER)[number])];
      if (!text || !plate || !arc || !centre) throw new Error(`could not read the angle label at ${at}`);
      const point = { x: num(text[1]), y: num(text[2]) };
      const label = decode(text[3]!);
      const angle = (x: number, y: number) => Math.atan2(y - centre.y, x - centre.x);
      // The label points at its angle when its centre is within the sweep of the drawn arc (which
      // stops 5° short of each ray, so a label hugging a ray does not count as inside).
      const start = angle(num(arc[1]), num(arc[2]));
      const sweep = norm(angle(num(arc[3]), num(arc[4])) - start);
      const [x, y, w, h] = [1, 2, 3, 4].map(i => num(plate[i]));
      const plateRect = { left: x!, top: y!, right: x! + w!, bottom: y! + h! };
      const ink = estimateLabelRect(point, label, LABEL_INK_BOX);
      return {
        text: label,
        at,
        point,
        plate: plateRect,
        insideSector: norm(angle(point.x, point.y) - start) <= sweep,
        onLine: lines.some(line => segmentNearRect(line, ink, ON_LINE_CLEARANCE)),
        coversChevron: chevrons.some(stroke => segmentNearRect(stroke, plateRect, 1)),
      };
    });
}

/** Centres of the parallel chevrons of one diagram. */
function chevronCentres(svg: string): Point[] {
  return [...svg.matchAll(/<g class="parallel-mark[^"]*" transform="translate\(([^ ]+) ([^)]+)\)/g)].map(m => ({ x: num(m[1]), y: num(m[2]) }));
}

/** For each parallel chevron, its distance (diagram units) to the nearest line crossing. */
export function chevronCrossingGaps(svg: string): number[] {
  const crossings = [...svg.matchAll(/<circle cx="([^"]+)" cy="([^"]+)"/g)].map(m => ({ x: num(m[1]), y: num(m[2]) }));
  return chevronCentres(svg).map(c => Math.min(...crossings.map(p => Math.hypot(p.x - c.x, p.y - c.y))));
}

/**
 * True when a stroke of a parallel chevron touches (comes within `clearance` of) a drawn angle arc —
 * the chevron then reads as part of the angle mark.
 */
export function chevronTouchesArc(svg: string, clearance = 2): boolean {
  const crossings = [...svg.matchAll(/<circle cx="([^"]+)" cy="([^"]+)"/g)].map(m => ({ x: num(m[1]), y: num(m[2]) }));
  const starts = [...svg.matchAll(/<g class="[^"]*" data-angle-role="[^"]*" data-angle-at="([^"]+)" data-angle-sector="\d">/g)];
  const arcs = starts.flatMap((m, i) => {
    const body = svg.slice(m.index + m[0].length, starts[i + 1]?.index ?? svg.length);
    const centre = crossings[CROSSING_ORDER.indexOf(m[1] as (typeof CROSSING_ORDER)[number])]!;
    return [...body.matchAll(/class="angle-arc[^"]*" d="M ([^ ]+) ([^ ]+) A ([^ ]+) [^ ]+ 0 [01] 1 ([^ ]+) ([^"]+)"/g)].map(a => {
      const start = Math.atan2(num(a[2]) - centre.y, num(a[1]) - centre.x);
      const end = Math.atan2(num(a[5]) - centre.y, num(a[4]) - centre.x);
      return { centre, radius: num(a[3]), start, sweep: norm(end - start), ends: [{ x: num(a[1]), y: num(a[2]) }, { x: num(a[4]), y: num(a[5]) }] };
    });
  });
  const strokes = chevronSegments(svg);
  return strokes.some(({ a, b }) => {
    for (let k = 0; k <= 20; k++) {
      const p = { x: a.x + ((b.x - a.x) * k) / 20, y: a.y + ((b.y - a.y) * k) / 20 };
      for (const arc of arcs) {
        const along = norm(Math.atan2(p.y - arc.centre.y, p.x - arc.centre.x) - arc.start) <= arc.sweep;
        const gap = along
          ? Math.abs(Math.hypot(p.x - arc.centre.x, p.y - arc.centre.y) - arc.radius)
          : Math.min(...arc.ends.map(e => Math.hypot(p.x - e.x, p.y - e.y)));
        if (gap < clearance) return true;
      }
    }
    return false;
  });
}
