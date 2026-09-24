import { type ReactNode } from 'react';
import { MathText } from './components/MathText';
import { BOOKLET_PAGES } from './content/booklet';
import {
  answerKeySummary,
  curriculumAnswerKeyPolicy,
  teacherAnswerKey,
  type TeacherAnswerEntry,
} from './content/answer-key';
import { TASK_KIND_LABEL, taskKindById } from './content/task-kinds';
import { describeLocation, locateTask, type TaskLocation } from './content/teacher-locator';

export type AnswerFlow = 'columns' | 'single';

/** Longest single answer line (in characters) that still reads well in half the page width. */
export const COLUMN_FLOW_MAX_LINE = 120;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const answerLines = (value: unknown): string[] =>
  typeof value === 'string' ? [value]
    : Array.isArray(value) ? value.flatMap(answerLines)
      : isRecord(value) ? Object.values(value).flatMap(answerLines)
        : [String(value)];

/**
 * How the answers of one student page flow on the printed page. Short answers (identification,
 * one-line calculations, one-word completions) read well two per row; a page with a proof, or
 * with a line too long for half the measure, keeps every answer at full width.
 */
export function answerFlow(answers: readonly unknown[]): AnswerFlow {
  const hasProof = answers.some(answer => isRecord(answer) && 'proof' in answer);
  const longest = Math.max(0, ...answers.flatMap(answerLines).map(line => line.length));
  return hasProof || longest > COLUMN_FLOW_MAX_LINE ? 'single' : 'columns';
}

const HEBREW_COUNT: Readonly<Record<number, string>> = { 1: 'שאלה אחת', 2: 'שתי שאלות', 3: 'שלוש שאלות', 4: 'ארבע שאלות', 5: 'חמש שאלות', 6: 'שש שאלות' };
const questionCount = (count: number) => HEBREW_COUNT[count] ?? `${count} שאלות`;

/**
 * Answer fields of the structured answer key, in the order a teacher reads them
 * (the answer itself, then notes on the data, then the proof and the reasoning),
 * each with the Hebrew heading printed in the guide. An answer field missing from
 * this list is a hard error — a raw data key must never reach the printed guide.
 */
const ANSWER_FIELDS: ReadonlyArray<readonly [field: string, heading: string]> = [
  ['values', 'תשובה'],
  ['choice', 'התשובה הנכונה'],
  ['completions', 'לפי סדר השורות'],
  ['conclusion', 'מסקנה'],
  ['unneededDatum', 'נתון שאינו נחוץ'],
  ['requiredDatum', 'הנתון הנדרש'],
  ['proof', 'הוכחה'],
  ['reason', 'נימוק'],
  ['justification', 'נימוק גאומטרי'],
];
const FIELD_HEADINGS: ReadonlyMap<string, string> = new Map(ANSWER_FIELDS);

/** Computed quantities that are plain numbers; every other computed value is an angle in degrees. */
const PLAIN_NUMBER_NAMES = new Set(['x', 'y']);

/** Hebrew value names used in the answer key → the phrase shown to the teacher. */
const HEBREW_VALUE_NAMES: Readonly<Record<string, string>> = {
  'זווית': 'גודל הזווית',
  'מתאימה': 'הזווית המתאימה',
  'מתחלפת': 'הזווית המתחלפת',
  'קודקודית': 'הזווית הקודקודית',
  'צמודה': 'הזווית הצמודה',
};

function ValueLine({ name, value }: { name: string; value: unknown }) {
  const unit = PLAIN_NUMBER_NAMES.has(name) ? '' : '°';
  const hebrewName = HEBREW_VALUE_NAMES[name];
  if (hebrewName) return <>{hebrewName}: <MathText text={`${String(value)}${unit}`} /></>;
  if (/[֐-׿]/.test(name)) {
    throw new Error(`Answer value "${name}" has no teacher-facing phrase — add it to HEBREW_VALUE_NAMES.`);
  }
  return <MathText text={`${name} = ${String(value)}${unit}`} />;
}

/** Unordered answer items mirror the student's sub-items; ordered ones are proof/line order. */
function AnswerList({ items, ordered }: { items: unknown[]; ordered: boolean }) {
  const children = items.map((item, index) => <li key={index}><MathText text={String(item)} /></li>);
  return ordered
    ? <ol className="teacher-answer-list teacher-answer-list--ordered">{children}</ol>
    : <ul className="teacher-answer-list">{children}</ul>;
}

function FieldContent({ field, value }: { field: string; value: unknown }): ReactNode {
  if (field === 'values') {
    if (!isRecord(value)) throw new Error('Answer field "values" must be an object of named quantities.');
    return (
      <ul className="teacher-answer-values">
        {Object.entries(value).map(([name, item]) => <li key={name}><ValueLine name={name} value={item} /></li>)}
      </ul>
    );
  }
  if (Array.isArray(value)) return <AnswerList items={value} ordered={field === 'proof' || field === 'completions'} />;
  return <MathText text={String(value)} />;
}

function AnswerBody({ answer }: { answer: unknown }) {
  if (typeof answer === 'string') return <p className="teacher-answer-text"><MathText text={answer} /></p>;

  if (Array.isArray(answer)) return <AnswerList items={answer} ordered={false} />;

  if (isRecord(answer)) {
    const unlabelled = Object.keys(answer).filter(field => !FIELD_HEADINGS.has(field));
    if (unlabelled.length) throw new Error(`Answer field(s) without a teacher-facing heading: ${unlabelled.join(', ')}`);
    return (
      <dl className="teacher-answer-fields">
        {ANSWER_FIELDS.filter(([field]) => field in answer).map(([field, heading]) => (
          <div className="teacher-answer-field" data-layout={Array.isArray(answer[field]) ? 'block' : 'inline'} key={field}>
            <dt>{heading}</dt>
            <dd><FieldContent field={field} value={answer[field]} /></dd>
          </div>
        ))}
      </dl>
    );
  }

  throw new Error(`Unsupported answer shape: ${JSON.stringify(answer)}`);
}

type LocatedEntry = { entry: TeacherAnswerEntry; location: TaskLocation };

/** Every authored answer with its place in the student booklet (global question + page number). */
function locateEntries(entries: readonly TeacherAnswerEntry[]): LocatedEntry[] {
  return entries.map(entry => ({ entry, location: locateTask(entry.id) }));
}

type PageGroup = { pageNumber: number; topic: string; items: LocatedEntry[] };

/** Answers grouped by the global page they are printed on, in booklet order. */
function groupByPage(located: readonly LocatedEntry[]): PageGroup[] {
  const byPage = new Map<number, LocatedEntry[]>();
  for (const item of located) {
    byPage.set(item.location.pageNumber, [...(byPage.get(item.location.pageNumber) ?? []), item]);
  }
  return [...byPage.entries()]
    .sort(([a], [b]) => a - b)
    .map(([pageNumber, items]) => ({
      pageNumber,
      topic: items[0]!.location.topic,
      items: [...items].sort((a, b) => a.location.questionNumber - b.location.questionNumber),
    }));
}

/** "12 · חישוב … עמוד 6" — the question's global number, its task type, and its page. */
function AnswerHeader({ location, kindClassName = 'teacher-answer-kind' }: { location: TaskLocation; kindClassName?: string }) {
  return (
    <header className="teacher-answer-header">
      <span className="teacher-answer-position" title={describeLocation(location)}>
        <span className="teacher-answer-position-number">{location.questionNumber}</span>
        <span className="teacher-visually-hidden">{`שאלה ${location.questionNumber}`}</span>
      </span>
      <span className={kindClassName}>{TASK_KIND_LABEL[taskKindById(location.id)]}</span>
      <span className="teacher-answer-locator" aria-hidden="true">עמוד {location.pageNumber}</span>
    </header>
  );
}

function AnswerStemOpening({ location }: { location: TaskLocation }) {
  return (
    <p className="teacher-answer-stem">
      <span className="teacher-visually-hidden">פתיחת השאלה: </span>
      <MathText text={location.stemOpening} />
    </p>
  );
}

/** The authored topics in booklet order, with their global page range and answer count. */
function topicSummary(located: readonly LocatedEntry[]) {
  const authoredTopics = [...new Set(BOOKLET_PAGES.filter(page => !page.curriculum).map(page => page.topic))];
  return authoredTopics.map(topic => {
    const items = located.filter(item => item.location.topic === topic);
    const pages = [...new Set(items.map(item => item.location.pageNumber))].sort((a, b) => a - b);
    return { topic, fromPage: pages[0]!, toPage: pages[pages.length - 1]!, answers: items.length };
  });
}

/** A numeric range such as 5–8, kept in reading order (5 before 8) inside Hebrew text. */
const NumberRange = ({ from, to }: { from: number; to: number }) => (
  <bdi dir="ltr" className="teacher-range">{from === to ? String(from) : `${from}–${to}`}</bdi>
);

function ContentsTable({ located }: { located: readonly LocatedEntry[] }) {
  const rows = topicSummary(located);
  const totalPages = new Set(located.map(item => item.location.pageNumber)).size;
  return (
    <table className="teacher-contents">
      <caption>תוכן המדריך</caption>
      <thead>
        <tr>
          <th scope="col">נושא</th>
          <th scope="col">עמודים</th>
          <th scope="col">תשובות</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.topic}>
            <th scope="row">{row.topic}</th>
            <td><NumberRange from={row.fromPage} to={row.toPage} /></td>
            <td>{row.answers}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">סה״כ</th>
          <td>{totalPages}</td>
          <td>{answerKeySummary.authoredTotal}</td>
        </tr>
      </tfoot>
    </table>
  );
}

function AnswerCard({ entry, location }: LocatedEntry) {
  return (
    <article className="teacher-answer-card" data-task-id={entry.id} data-question-number={location.questionNumber}>
      <AnswerHeader location={location} />
      <AnswerStemOpening location={location} />
      <div className="teacher-answer-body">
        <AnswerBody answer={entry.answer} />
      </div>
      {entry.note ? (
        <aside className="teacher-answer-note">
          <strong>הערה למורה:</strong> <MathText text={entry.note} />
        </aside>
      ) : null}
    </article>
  );
}

/**
 * Answers of one student page in printed rows: two per row in the two-column flow, one per row
 * otherwise. A row is kept whole on one sheet.
 */
function answerRows(items: readonly LocatedEntry[], flow: AnswerFlow): LocatedEntry[][] {
  const size = flow === 'columns' ? 2 : 1;
  const rows: LocatedEntry[][] = [];
  for (let index = 0; index < items.length; index += size) rows.push(items.slice(index, index + size));
  return rows;
}

/** The answers of one student page: a heading naming the page and its topic, then the rows. */
function PageAnswers({ pageNumber, topic, items }: PageGroup) {
  const flow = answerFlow(items.map(item => item.entry.answer));
  const first = items[0]!.location.questionNumber;
  const last = items[items.length - 1]!.location.questionNumber;
  return (
    <section className="teacher-page-group" aria-labelledby={`teacher-p${pageNumber}`}>
      <header className="teacher-page-heading">
        <h3 id={`teacher-p${pageNumber}`}>עמוד {pageNumber} · {topic}</h3>
        <p className="teacher-page-count">
          {questionCount(items.length)} בעמוד · שאלות <NumberRange from={first} to={last} />
        </p>
      </header>

      <div className="teacher-answer-grid" data-flow={flow}>
        {answerRows(items, flow).map(row => (
          <div className="teacher-answer-row" key={row[0]!.entry.id}>
            {row.map(item => <AnswerCard key={item.entry.id} {...item} />)}
          </div>
        ))}
      </div>
    </section>
  );
}

/** A sample answer header on the cover, showing how the guide points at a numbered question. */
function LocatorExample() {
  const sample = teacherAnswerKey.map(entry => locateTask(entry.id)).find(location => taskKindById(location.id) === 'calculation');
  if (!sample) throw new Error('The cover example needs a calculation question.');
  return (
    <figure className="teacher-locator-example">
      <div className="teacher-locator-sample">
        <AnswerHeader location={sample} kindClassName="teacher-sample-kind" />
        <p className="teacher-answer-stem"><MathText text={sample.stemOpening} /></p>
      </div>
      <figcaption>
        כך נראית כותרת של תשובה במדריך. כאן: {describeLocation(sample)} — כלומר {describeLocation(sample)} בחוברת —
        ומשימה מסוג „{TASK_KIND_LABEL[taskKindById(sample.id)]}”, כפי שהסוג כתוב בדף התלמיד.
      </figcaption>
    </figure>
  );
}

export default function TeacherApp() {
  const located = locateEntries(teacherAnswerKey);
  const pages = groupByPage(located);
  const firstPage = pages[0]!.pageNumber;
  const lastPage = pages[pages.length - 1]!.pageNumber;

  return (
    <main
      className="teacher-document"
      data-teacher-ready="true"
      data-answer-count={answerKeySummary.authoredTotal}
      data-unit5-source-blocks={curriculumAnswerKeyPolicy.selectedSourceBlocks}
      dir="rtl"
    >
      <section className="teacher-cover" aria-labelledby="teacher-title">
        <header className="teacher-cover-title">
          <p className="teacher-kicker">מדריך למורה</p>
          <h1 id="teacher-title">זוויות בין ישרים מקבילים</h1>
          <p className="teacher-cover-subtitle">מפתח תשובות לנושאים הדידקטיים (עמודים <NumberRange from={firstPage} to={lastPage} />)</p>
        </header>

        <p className="teacher-cover-lead">
          המדריך כולל את התשובות לכל המשימות הדידקטיות, כולל נימוקים גאומטריים ופתרון המשוואות,
          לפי סדר העמודים והשאלות בחוברת. כל תשובה מזוהה לפי מספר השאלה הגלובלי ומספר העמוד.
        </p>

        <ContentsTable located={located} />
        <p className="teacher-cover-footnote">
          * בתחילת החוברת מובאות {curriculumAnswerKeyPolicy.selectedSourceBlocks} שאלות מתוך תוכנית הלימודים כפי שהן במקור,
          ולשאלות אלה לא צורפו פתרונות.
        </p>

        <section className="teacher-howto" aria-labelledby="teacher-howto-title">
          <h2 id="teacher-howto-title">איך מוצאים את התשובה לשאלה</h2>
          <p>
            בדפי התלמיד כל שאלה נושאת מספר גלובלי רציף, וכל עמוד ממוספר בעיגול. במדריך כל תשובה מסומנת לפי
            אותו מספר שאלה ומספר העמוד — <strong className="teacher-inline-position">שאלה 12 · עמוד 6</strong> —
            ולצדם סוג המשימה ומילות הפתיחה של השאלה.
          </p>
          <LocatorExample />
        </section>
      </section>

      {pages.map(page => <PageAnswers key={page.pageNumber} {...page} />)}

      <section className="teacher-source-policy" aria-labelledby="teacher-source-title">
        <header className="teacher-section-heading">
          <p className="teacher-section-kicker">מדיניות המקור</p>
          <h2 id="teacher-source-title">שאלות מתוך תוכנית הלימודים</h2>
        </header>
        <p>
          בתחילת החוברת מובאות {curriculumAnswerKeyPolicy.selectedSourceBlocks} שאלות מתוך תוכנית הלימודים, בדיוק כפי שהן
          במקור. לשאלות אלה לא צורף מפתח תשובות.
        </p>
      </section>
    </main>
  );
}
