/**
 * Test support: render the whole student booklet and capture, for every diagram, the props the
 * page passed to the diagram engine next to the real SVG those props produced — plus where the
 * diagram sits (unit, page, task id).
 *
 * Usage (vi.mock is hoisted, so each test file declares the mocks itself):
 *
 *   vi.mock('../../src/geometry/ParallelLinesDiagram', importOriginal => probeModule(importOriginal, 'ParallelLinesDiagram', 'parallel'));
 *   vi.mock('../../src/geometry/ThreeLinesDiagram', importOriginal => probeModule(importOriginal, 'ThreeLinesDiagram', 'three'));
 *   const diagrams = await renderBookletDiagrams();
 *
 * The probe does not replace the engine: it renders an empty marker element followed by the real
 * component, so every measurement below is taken from the SVG the student actually sees.
 */
import type { ParallelLinesDiagramProps } from '../../../src/geometry/ParallelLinesDiagram';
import type { ThreeLinesDiagramProps } from '../../../src/geometry/ThreeLinesDiagram';

export type DiagramKind = 'parallel' | 'three';

type CapturedProps =
  | { kind: 'parallel'; props: ParallelLinesDiagramProps }
  | { kind: 'three'; props: ThreeLinesDiagramProps };

export type BookletDiagram = CapturedProps & {
  /** Position of the diagram in booklet order (0-based). */
  index: number;
  unit: number;
  page: number;
  /** data-task-id of the question block that holds the diagram. */
  taskId: string | null;
  /** The rendered <svg …>…</svg> markup of this diagram. */
  svg: string;
};

const PROBE_ATTRIBUTE = 'data-diagram-probe';
const state = { captured: [] as CapturedProps[] };

/** vi.mock factory body: wraps one diagram component so each render is recorded. */
export async function probeModule<M extends Record<string, unknown>>(
  importOriginal: () => Promise<M>,
  exportName: 'ParallelLinesDiagram' | 'ThreeLinesDiagram',
  kind: DiagramKind,
): Promise<M> {
  const actual = await importOriginal();
  const react = await import('react');
  const Original = actual[exportName] as (props: never) => unknown;
  const Probe = (props: ParallelLinesDiagramProps & ThreeLinesDiagramProps) => {
    const index = state.captured.length;
    state.captured.push(kind === 'parallel' ? { kind, props } : { kind, props });
    return react.createElement(
      react.Fragment,
      null,
      react.createElement('i', { [PROBE_ATTRIBUTE]: index, hidden: true }),
      react.createElement(Original as never, props as never),
    );
  };
  return { ...actual, [exportName]: Probe };
}

function lastMatchBefore(html: string, pattern: RegExp, position: number): RegExpExecArray | null {
  let found: RegExpExecArray | null = null;
  const re = new RegExp(pattern.source, 'g');
  for (let m = re.exec(html); m && m.index < position; m = re.exec(html)) found = m;
  return found;
}

/** Renders the student booklet (App) and returns every diagram in booklet order. */
export async function renderBookletDiagrams(): Promise<BookletDiagram[]> {
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { default: App } = await import('../../../src/App');
  state.captured.length = 0;
  const html = renderToStaticMarkup(createElement(App));
  const probes = [...html.matchAll(new RegExp(`<i ${PROBE_ATTRIBUTE}="(\\d+)"[^>]*></i>`, 'g'))];
  if (probes.length !== state.captured.length) {
    throw new Error(`captured ${state.captured.length} diagrams but found ${probes.length} probes in the markup`);
  }
  return probes.map(probe => {
    const index = Number(probe[1]);
    const at = probe.index + probe[0].length;
    const page = lastMatchBefore(html, /<article class="a4-page[^"]*" data-unit="(\d+)" data-page="(\d+)"/, at);
    const section = lastMatchBefore(html, /<section class="question-block[^"]*"([^>]*)>/, at);
    const svgStart = html.indexOf('<svg', at);
    const svg = html.slice(svgStart, html.indexOf('</svg>', svgStart) + '</svg>'.length);
    const captured = state.captured[index]!;
    return {
      ...captured,
      index,
      unit: Number(page?.[1] ?? Number.NaN),
      page: Number(page?.[2] ?? Number.NaN),
      taskId: /data-task-id="([^"]+)"/.exec(section?.[1] ?? '')?.[1] ?? null,
      svg,
    };
  });
}
