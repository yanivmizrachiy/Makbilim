/**
 * Teacher locator — how the teacher guide points at a question on an UNNUMBERED student page.
 *
 * Student pages of units 1–4 carry no question numbers: every question starts with ●. The
 * guide therefore names a question by its unit, its student page and its ● POSITION on that
 * page (1 = the first ● from the top), and quotes the opening words of its stem.
 *
 * The position is derived from the same content arrays and page filters the student pages
 * render (units 2–4: `questions.filter(q => q.page === page)`; unit 1 in array order), and
 * tests/unit/teacher-guide.test.ts proves it against the rendered booklet: the n-th ● on every
 * rendered student page is the task this module calls position n.
 */
import { segmentMathText } from '../components/MathText';
import { unit1Questions } from './questions-unit1';
import { unit2Questions } from './questions-unit2';
import { unit3Questions } from './questions-unit3';
import { unit4Questions } from './questions-unit4';

export type TeacherUnit = 1 | 2 | 3 | 4;

export type TaskLocation = {
  readonly id: string;
  readonly unit: TeacherUnit;
  /** Student page number inside the unit (numbering resets per unit, as in the booklet). */
  readonly page: number;
  /** 1-based position of the task's ● on its student page, counted from the top. */
  readonly position: number;
  /** How many ● questions that student page has. */
  readonly questionsOnPage: number;
  /** The full student-facing stem. */
  readonly stem: string;
  /** The first words of the stem, cut only between words and never inside a math run. */
  readonly stemOpening: string;
};

type StudentTask = { id: string; unit: TeacherUnit; page: number; stem: string };

const studentTasks: readonly StudentTask[] = [
  ...unit1Questions.map(q => ({ id: q.id, unit: 1 as const, page: q.page, stem: q.stem })),
  ...unit2Questions.map(q => ({ id: q.id, unit: 2 as const, page: q.page, stem: q.stem })),
  ...unit3Questions.map(q => ({ id: q.id, unit: 3 as const, page: q.page, stem: q.stem })),
  ...unit4Questions.map(q => ({ id: q.id, unit: 4 as const, page: q.page, stem: q.stem })),
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
  // Character ranges of every math run: whitespace inside them is not a word boundary.
  const protectedRanges: Array<[number, number]> = [];
  let offset = 0;
  for (const segment of segmentMathText(stem)) {
    if (segment.kind === 'math') protectedRanges.push([offset, offset + segment.source.length]);
    offset += segment.source.length;
  }
  const insideMath = (index: number) => protectedRanges.some(([start, end]) => index > start && index < end);

  // End offsets (exclusive) of each word.
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
  // Close a quotation that the cut left open, after the ellipsis.
  const opens = (opening.match(/„/g) ?? []).length;
  const closes = (opening.match(/”/g) ?? []).length;
  opening += ELLIPSIS;
  if (opens > closes) opening += '”';
  return opening;
}

const locations: ReadonlyMap<string, TaskLocation> = (() => {
  const byPage = new Map<string, StudentTask[]>();
  for (const task of studentTasks) {
    const key = `${task.unit}-${task.page}`;
    byPage.set(key, [...(byPage.get(key) ?? []), task]);
  }
  const result = new Map<string, TaskLocation>();
  for (const tasks of byPage.values()) {
    // Openings must tell the questions of one page apart: lengthen colliding ones until they differ.
    const openings = tasks.map(task => stemOpening(task.stem));
    for (let words = STEM_OPENING_WORDS + 1; words <= 40; words += 1) {
      const collides = openings.map((opening, index) => openings.some((other, j) => j !== index && other === opening));
      if (!collides.includes(true)) break;
      tasks.forEach((task, index) => { if (collides[index]) openings[index] = stemOpening(task.stem, words); });
    }
    tasks.forEach((task, index) => {
      if (result.has(task.id)) throw new Error(`Duplicate student task id: ${task.id}`);
      result.set(task.id, {
        id: task.id,
        unit: task.unit,
        page: task.page,
        position: index + 1,
        questionsOnPage: tasks.length,
        stem: task.stem,
        stemOpening: openings[index]!,
      });
    });
  }
  return result;
})();

export function locateTask(id: string): TaskLocation {
  const location = locations.get(id);
  if (!location) throw new Error(`Task ${id} is not on any student page — the guide cannot point to it.`);
  return location;
}

/** Hebrew feminine ordinals ("השאלה השלישית"), for the spoken/accessible form of a ● position. */
const ORDINALS = ['הראשונה', 'השנייה', 'השלישית', 'הרביעית', 'החמישית', 'השישית', 'השביעית', 'השמינית'];

export function positionOrdinal(position: number): string {
  const word = ORDINALS[position - 1];
  if (!word) throw new Error(`No Hebrew ordinal for question position ${position}.`);
  return word;
}

/** Full plain-language locator, e.g. "השאלה השלישית בעמוד 2 של יחידה 1". */
export function describeLocation(location: Pick<TaskLocation, 'unit' | 'page' | 'position'>): string {
  return `השאלה ${positionOrdinal(location.position)} בעמוד ${location.page} של יחידה ${location.unit}`;
}
