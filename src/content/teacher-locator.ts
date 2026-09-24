/**
 * Teacher locator — how the teacher guide points at a question in the student booklet.
 *
 * Questions are NOT numbered on the page (only pages are, SPEC 4.1/4.2); each question opens with a
 * ● marker. So the guide names a question by its GLOBAL PAGE NUMBER and its POSITION on that page
 * (the n-th ● on the page), and quotes the opening words of its stem. The page order and document
 * order come from the single booklet order in src/content/booklet.ts; the per-task `page` fields
 * (local page inside a unit file) map to a global page id `U{unit}-P{page}`.
 */
import { segmentMathText } from '../components/MathText';
import { AUTHORED_TASK_IDS, globalPageNumber, topicOf } from './booklet';
import { unit1Questions } from './questions-unit1';
import { unit2Questions } from './questions-unit2';
import { unit3Questions } from './questions-unit3';
import { unit4Questions } from './questions-unit4';

export type TaskLocation = {
  readonly id: string;
  /** The question's position on its page (1 = the first ● on the page, and so on). */
  readonly positionOnPage: number;
  /** Continuous global page number (1..N) of the page the question is printed on. */
  readonly pageNumber: number;
  /** The natural topic title of that page. */
  readonly topic: string;
  /** The full student-facing stem. */
  readonly stem: string;
  /** The first words of the stem, cut only between words and never inside a math run. */
  readonly stemOpening: string;
};

type StudentTask = { id: string; pageId: string; stem: string };

const studentTasks: readonly StudentTask[] = [
  ...unit1Questions.map(q => ({ id: q.id, pageId: `U1-P${q.page}`, stem: q.stem })),
  ...unit2Questions.map(q => ({ id: q.id, pageId: `U2-P${q.page}`, stem: q.stem })),
  ...unit3Questions.map(q => ({ id: q.id, pageId: `U3-P${q.page}`, stem: q.stem })),
  ...unit4Questions.map(q => ({ id: q.id, pageId: `U4-P${q.page}`, stem: q.stem })),
];

/** Words of the stem opening. A stem at most STEM_OPENING_SLACK words longer is shown whole. */
export const STEM_OPENING_WORDS = 7;
const STEM_OPENING_SLACK = 2;

/** Hebrew words that must not end a cut-off opening ("…חשבו את…" reads as broken). */
const DANGLING_WORDS = new Set([
  'את', 'של', 'על', 'ידי', 'כי', 'אם', 'בין', 'עם', 'אל', 'או', 'גם', 'וכן', 'ואת', 'ושל', 'מן', 'כך', 'לפי',
  'הם', 'הן', 'היא', 'הוא', 'נתון', 'ונתון', 'שתי', 'שני', 'בשתי', 'בזוג', 'ישר',
]);

const ELLIPSIS = '…';

/**
 * The opening words of a stem. A "word" is a run of text between spaces, except that a math
 * run (as MathText segments it, e.g. "∠A = 68°" or "(3x + 14)°") is indivisible — so the cut
 * never splits an expression and the opening re-segments into the same math islands.
 */
export function stemOpening(stem: string, maxWords = STEM_OPENING_WORDS): string {
  const protectedRanges: Array<[number, number]> = [];
  let offset = 0;
  for (const segment of segmentMathText(stem)) {
    if (segment.kind === 'math') protectedRanges.push([offset, offset + segment.source.length]);
    offset += segment.source.length;
  }
  const insideMath = (index: number) => protectedRanges.some(([start, end]) => index > start && index < end);

  const wordEnds: number[] = [];
  let inWord = false;
  for (let index = 0; index <= stem.length; index += 1) {
    const char = stem[index];
    const boundary = char === undefined || (/\s/.test(char) && !insideMath(index));
    if (boundary && inWord) wordEnds.push(index);
    inWord = !boundary;
  }
  if (wordEnds.length <= maxWords + STEM_OPENING_SLACK) return stem.trim();

  let count = maxWords;
  const wordAt = (n: number) => stem.slice(n > 1 ? wordEnds[n - 2]! : 0, wordEnds[n - 1]).trim();
  while (count > 4 && DANGLING_WORDS.has(wordAt(count).replace(/[.,:;]$/, ''))) count -= 1;

  let opening = stem.slice(0, wordEnds[count - 1]).replace(/[\s.,:;־-]+$/u, '');
  const opens = (opening.match(/„/g) ?? []).length;
  const closes = (opening.match(/”/g) ?? []).length;
  opening += ELLIPSIS;
  if (opens > closes) opening += '”';
  return opening;
}

const locations: ReadonlyMap<string, TaskLocation> = (() => {
  const byId = new Map(studentTasks.map(task => [task.id, task]));
  // Position on a page = the order of the question among the questions printed on that page, in
  // document order (AUTHORED_TASK_IDS = the plan order = the print order).
  const positionOnPage = new Map<string, number>();
  const seenPerPage = new Map<number, number>();
  for (const id of AUTHORED_TASK_IDS) {
    const task = byId.get(id);
    if (!task) continue;
    const pageNumber = globalPageNumber(task.pageId);
    const next = (seenPerPage.get(pageNumber) ?? 0) + 1;
    seenPerPage.set(pageNumber, next);
    positionOnPage.set(id, next);
  }
  const result = new Map<string, TaskLocation>();
  for (const task of studentTasks) {
    if (result.has(task.id)) throw new Error(`Duplicate student task id: ${task.id}`);
    result.set(task.id, {
      id: task.id,
      positionOnPage: positionOnPage.get(task.id) ?? 1,
      pageNumber: globalPageNumber(task.pageId),
      topic: topicOf(task.pageId),
      stem: task.stem,
      stemOpening: stemOpening(task.stem),
    });
  }
  return result;
})();

export function locateTask(id: string): TaskLocation {
  const location = locations.get(id);
  if (!location) throw new Error(`Task ${id} is not on any student page — the guide cannot point to it.`);
  return location;
}

/** Plain-language locator, e.g. "עמוד 6 · שאלה 3 בעמוד" (the 3rd ● on page 6). */
export function describeLocation(location: Pick<TaskLocation, 'positionOnPage' | 'pageNumber'>): string {
  return `עמוד ${location.pageNumber} · שאלה ${location.positionOnPage} בעמוד`;
}
