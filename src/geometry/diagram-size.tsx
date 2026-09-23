/**
 * Diagram size selection — which size class (geometryTokens.size) a diagram is drawn in.
 *
 * The question block decides it once, from data, and passes it down through a context:
 *  - identification tasks (mark / match / classify on the diagram) → 'mark': the diagram is the
 *    answer surface, so it gets the widest column. MARK_SIZE_BY_TASK fits a few identification
 *    figures to their page: 'markLarge' where the page has room, 'compact' where it has none;
 *  - a split question (diagram beside the text) → 'compact';
 *  - a diagram under a full-width stem → 'full';
 *  - DENSE_TASKS: the few split questions on pages that would otherwise overflow A4 → 'dense'
 *    (a smaller figure, never smaller labels).
 * Figures inside a table row or a side-by-side pair pass their own `size` ('table' / 'pair').
 */
import { createContext, useContext, type ReactNode } from 'react';
import type { DiagramSize } from '../styles/tokens';
import type { TaskKind } from '../content/task-kinds';

export type { DiagramSize } from '../styles/tokens';

/** Tasks whose diagram is drawn one size class smaller so their page fits A4 without clipping. */
export const DENSE_TASKS: ReadonlySet<string> = new Set([
  'U1-P3-D',
  'U3-P3-A',
  'U3-P3-B',
  'U3-P3-C',
  'U3-P3-D',
]);

/**
 * Identification figures sized to their page instead of the default 'mark':
 *  - unit 1, page 1 holds four mark-on-diagram tasks and nothing else: the student marks on the
 *    figure, so the page's room goes to a larger figure ('markLarge'), never to empty bands;
 *  - U1-P3-C shares page 4 with a four-row table and a two-figure claim task: 'compact' (still
 *    larger than 'dense', so its eight lettered angles stay apart).
 */
export const MARK_SIZE_BY_TASK: Readonly<Record<string, DiagramSize>> = {
  'U1-P1-A': 'markLarge',
  'U1-P1-B': 'markLarge',
  'U1-P1-C': 'markLarge',
  'U1-P1-D': 'markLarge',
  'U1-P3-C': 'compact',
};

export function diagramSizeFor({
  taskId,
  kind,
  compact,
}: {
  taskId?: string | undefined;
  kind?: TaskKind | undefined;
  compact: boolean;
}): DiagramSize {
  if (taskId && DENSE_TASKS.has(taskId)) return 'dense';
  if (kind === 'identification') return (taskId && MARK_SIZE_BY_TASK[taskId]) || 'mark';
  return compact ? 'compact' : 'full';
}

const DiagramSizeContext = createContext<DiagramSize>('full');

export function DiagramSizeProvider({ size, children }: { size: DiagramSize; children: ReactNode }) {
  return <DiagramSizeContext.Provider value={size}>{children}</DiagramSizeContext.Provider>;
}

/**
 * The size a diagram is drawn in: its own `size` prop, else its question's, else 'full'.
 * A side-by-side pair inside a dense question is drawn in the dense pair size.
 */
export function useDiagramSize(explicit: DiagramSize | undefined): DiagramSize {
  const inherited = useContext(DiagramSizeContext);
  if (explicit === 'pair' && inherited === 'dense') return 'densePair';
  return explicit ?? inherited;
}
