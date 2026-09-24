/**
 * Booklet order and global numbering — the ONE source of the student-facing structure.
 *
 * SPEC 4.1/4.2/4.3: the booklet is organized by natural TOPICS (never "יחידה N"), the
 * curriculum questions ("שאלות מתוך תוכנית הלימודים") come FIRST, page numbers run
 * continuously 1..N (a number-only circle, no per-unit reset), and every question carries a
 * continuous global number 1..N. The `U{unit}-P{page}` ids remain only as internal, stable page
 * ids (a maintenance artifact, never shown); this module maps them to the booklet's global order.
 */
import bookletPages from './booklet-pages.json';
import plan from './question-plan.json';
import { unit5Questions } from './questions-unit5';

/** A page of the booklet, in printed order. `curriculum` marks the verbatim source pages. */
export type BookletPage = { readonly id: string; readonly topic: string; readonly curriculum?: boolean };

/**
 * The printed order of the booklet's pages — read from booklet-pages.json, the ONE source of the
 * order (the PDF/layout QA scripts and the validators read the same file). Curriculum first, then
 * the authored topics mapped from the internal `unit*` page ids. Topic titles are natural (no
 * "יחידה"); several pages may share a topic. This array's order IS the continuous page numbering.
 */
export const BOOKLET_PAGES: readonly BookletPage[] = bookletPages.pages;

const pageIndexById = new Map(BOOKLET_PAGES.map((page, index) => [page.id, index]));

/** Continuous global page number (1..N) of a page, by its internal page id. */
export function globalPageNumber(pageId: string): number {
  const index = pageIndexById.get(pageId);
  if (index === undefined) throw new Error(`Unknown booklet page id "${pageId}" — add it to BOOKLET_PAGES.`);
  return index + 1;
}

/** The natural topic title printed on a page (never "יחידה N"). */
export function topicOf(pageId: string): string {
  const page = BOOKLET_PAGES.find(item => item.id === pageId);
  if (!page) throw new Error(`Unknown booklet page id "${pageId}".`);
  return page.topic;
}

export function isCurriculumPage(pageId: string): boolean {
  return Boolean(BOOKLET_PAGES.find(item => item.id === pageId)?.curriculum);
}

export const BOOKLET_PAGE_COUNT = BOOKLET_PAGES.length;
export const CURRICULUM_PAGE_COUNT = BOOKLET_PAGES.filter(page => page.curriculum).length;
export const AUTHORED_PAGE_COUNT = BOOKLET_PAGE_COUNT - CURRICULUM_PAGE_COUNT;

/** The 8 curriculum block ids, in source order — the first questions of the booklet. */
export const CURRICULUM_QUESTION_IDS: readonly string[] = unit5Questions.map(question => question.id);

/** The authored task ids, in booklet (document) order — question-plan.json lists them in that order. */
export const AUTHORED_TASK_IDS: readonly string[] = plan.units.flatMap(unit => unit.tasks.map(task => task.id));

/**
 * The document order of every question over the WHOLE booklet: curriculum questions first, then the
 * authored questions, matching the printed top-to-bottom order. Questions are NOT numbered on the
 * page (only pages are, SPEC 4.1); this order drives the teacher guide's page grouping and the
 * position of a question on its page.
 */
export const QUESTION_ORDER: readonly string[] = [...CURRICULUM_QUESTION_IDS, ...AUTHORED_TASK_IDS];

export const BOOKLET_QUESTION_COUNT = QUESTION_ORDER.length;
