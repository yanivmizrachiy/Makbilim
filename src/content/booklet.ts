/**
 * Booklet order and global numbering — the ONE source of the student-facing structure.
 *
 * SPEC 4.1/4.2/4.3: the booklet is organized by natural TOPICS (never "יחידה N"), the
 * curriculum questions ("שאלות מתוך תוכנית הלימודים") come FIRST, page numbers run
 * continuously 1..N (a number-only circle, no per-unit reset), and every question carries a
 * continuous global number 1..N. The `U{unit}-P{page}` ids remain only as internal, stable page
 * ids (a maintenance artifact, never shown); this module maps them to the booklet's global order.
 */
import plan from './question-plan.json';
import { unit5Questions } from './questions-unit5';

/** A page of the booklet, in printed order. `curriculum` marks the verbatim source pages. */
export type BookletPage = { readonly id: string; readonly topic: string; readonly curriculum?: boolean };

/**
 * The printed order of the booklet's pages. Curriculum first (4 pages), then the authored topics
 * mapped from the internal `unit*` page ids. Topic titles are natural (no "יחידה"); several pages
 * may share a topic. This array's order IS the continuous page numbering.
 */
export const BOOKLET_PAGES: readonly BookletPage[] = [
  { id: 'C-P1', topic: 'שאלות מתוך תוכנית הלימודים', curriculum: true },
  { id: 'C-P2', topic: 'שאלות מתוך תוכנית הלימודים', curriculum: true },
  { id: 'C-P3', topic: 'שאלות מתוך תוכנית הלימודים', curriculum: true },
  { id: 'C-P4', topic: 'שאלות מתוך תוכנית הלימודים', curriculum: true },
  { id: 'U1-P5', topic: 'הגדרות ושמונה הזוויות' },
  { id: 'U1-P1', topic: 'זוויות מתאימות ומתחלפות' },
  { id: 'U1-P2', topic: 'זוויות מתאימות ומתחלפות' },
  { id: 'U1-P3', topic: 'המשפטים הישירים' },
  { id: 'U1-P4', topic: 'המשפטים הישירים' },
  { id: 'U2-P1', topic: 'חישובי זוויות' },
  { id: 'U2-P2', topic: 'חישובי זוויות' },
  { id: 'U2-P3', topic: 'חישובי זוויות' },
  { id: 'U2-P4', topic: 'אלגברה' },
  { id: 'U2-P5', topic: 'אלגברה' },
  { id: 'U2-P6', topic: 'אלגברה' },
  { id: 'U3-P1', topic: 'נימוק והוכחה' },
  { id: 'U3-P2', topic: 'נימוק והוכחה' },
  { id: 'U3-P3', topic: 'נימוק והוכחה' },
  { id: 'U4-P1', topic: 'המשפטים ההפוכים' },
  { id: 'U4-P2', topic: 'המשפטים ההפוכים' },
];

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

/** The 8 curriculum block ids, in source order — the first questions of the booklet. */
export const CURRICULUM_QUESTION_IDS: readonly string[] = unit5Questions.map(question => question.id);

/** The authored task ids, in booklet (document) order — question-plan.json lists them in that order. */
export const AUTHORED_TASK_IDS: readonly string[] = plan.units.flatMap(unit => unit.tasks.map(task => task.id));

/**
 * The continuous global question order over the WHOLE booklet: curriculum questions first
 * (1..8), then the authored questions (9..N), matching the printed top-to-bottom order.
 */
export const QUESTION_ORDER: readonly string[] = [...CURRICULUM_QUESTION_IDS, ...AUTHORED_TASK_IDS];

const questionNumberById = new Map(QUESTION_ORDER.map((id, index) => [id, index + 1]));

/** Continuous global question number (1..N) of a question, by its task/block id. */
export function globalQuestionNumber(id: string): number {
  const number = questionNumberById.get(id);
  if (number === undefined) throw new Error(`No global question number for "${id}" — it is not in QUESTION_ORDER.`);
  return number;
}

export const BOOKLET_QUESTION_COUNT = QUESTION_ORDER.length;
