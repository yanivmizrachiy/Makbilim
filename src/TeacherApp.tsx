import { type ReactNode } from 'react';
import { MathText } from './components/MathText';
import {
  answerKeySummary,
  curriculumAnswerKeyPolicy,
  teacherAnswerKey,
  type TeacherAnswerEntry,
} from './content/answer-key';
import pageManifest from './content/page-manifest.json';
import { TASK_KIND_LABEL, taskKindById } from './content/task-kinds';
import { describeLocation, locateTask, type TaskLocation, type TeacherUnit } from './content/teacher-locator';

const unitTitles: Record<number, string> = {
  1: 'מושגים בסיסיים',
  2: 'תרגילי חישוב',
  3: 'תרגילי הוכחה',
  4: 'משפטים הפוכים',
  5: 'שאלות מתוך תוכנית הלימודים',
};

export type AnswerFlow = 'columns' | 'single';

/** Longest single answer line (in characters) that still reads well in half the page width. */
export const COLUMN_FLOW_MAX_LINE = 120;

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

const answersPerUnit: Readonly<Record<TeacherUnit, number>> = {
  1: answerKeySummary.unit1,
  2: answerKeySummary.unit2,
  3: answerKeySummary.unit3,
  4: answerKeySummary.unit4,
};

const studentPagesPerUnit = new Map<number, number>([
  ...pageManifest.originalUnits.map(unit => [unit.unit, unit.pages] as const),
  [pageManifest.curriculumUnit.unit, pageManifest.curriculumUnit.pages] as const,
]);

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function ValueLine({ name, value }: { name: string; value: unknown }) {
  const unit = PLAIN_NUMBER_NAMES.has(name) ? '' : '°';
  const hebrewName = HEBREW_VALUE_NAMES[name];
  if (hebrewName) return <>{hebrewName}: <MathText text={`${String(value)}${unit}`} /></>;
  if (/[֐-׿]/.test(name)) {
    throw new Error(`Answer value "${name}" has no teacher-facing phrase — add it to HEBREW_VALUE_NAMES.`);
  }
  return <MathText text={`${name} = ${String(value)}${unit}`} />;
}

/** Unordered answer items mirror the student's sub-item marker •; ordered ones are proof/line order. */
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
          // A list field (proof lines, several reasons) is a "block": in the narrow two-column
          // flow its heading sits above the list so every line gets the full column width.
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

/** Every answer with its place in the student booklet; the key's page must be the page the task is printed on. */
function locateEntries(entries: readonly TeacherAnswerEntry[]): LocatedEntry[] {
  return entries.map(entry => {
    const location = locateTask(entry.id);
    if (location.unit !== entry.unit || location.page !== entry.page) {
      throw new Error(`Answer ${entry.id} is filed under unit ${entry.unit} page ${entry.page}, but the task is printed on unit ${location.unit} page ${location.page}.`);
    }
    return { entry, location };
  });
}

type PageGroup = { page: number; items: LocatedEntry[] };
type UnitGroup = { unit: TeacherUnit; pages: PageGroup[] };

function groupByUnitAndPage(located: readonly LocatedEntry[]): UnitGroup[] {
  const units = new Map<TeacherUnit, Map<number, LocatedEntry[]>>();
  for (const item of located) {
    const pages = units.get(item.location.unit) ?? new Map<number, LocatedEntry[]>();
    pages.set(item.location.page, [...(pages.get(item.location.page) ?? []), item]);
    units.set(item.location.unit, pages);
  }
  return [...units.entries()]
    .sort(([a], [b]) => a - b)
    .map(([unit, pages]) => ({
      unit,
      pages: [...pages.entries()]
        .sort(([a], [b]) => a - b)
        .map(([page, items]) => ({ page, items: [...items].sort((a, b) => a.location.position - b.location.position) })),
    }));
}

/**
 * "● 3 | חישוב … יחידה 2 · עמוד 1" — the question's ● position on its student page (the student
 * page has no numbers, so this is "the third ● from the top"), the task type exactly as the
 * student page labels it, and where the page is.
 */
function AnswerHeader({ location, kindClassName = 'teacher-answer-kind' }: { location: TaskLocation; kindClassName?: string }) {
  return (
    <header className="teacher-answer-header">
      <span className="teacher-answer-position" title={describeLocation(location)}>
        <span className="teacher-answer-marker" aria-hidden="true">●</span>
        <span className="teacher-answer-position-number">{location.position}</span>
        <span className="teacher-visually-hidden">{`, ${describeLocation(location)}`}</span>
      </span>
      <span className={kindClassName}>{TASK_KIND_LABEL[taskKindById(location.id)]}</span>
      <span className="teacher-answer-locator" aria-hidden="true">
        יחידה {location.unit} · עמוד {location.page}
      </span>
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

function ContentsTable() {
  const originalUnits = [1, 2, 3, 4] as const;
  const studentPages = [...studentPagesPerUnit.values()].reduce((sum, pages) => sum + pages, 0);
  return (
    <table className="teacher-contents">
      <caption>תוכן המדריך</caption>
      <thead>
        <tr>
          <th scope="col">יחידה</th>
          <th scope="col">נושא</th>
          <th scope="col">עמודים בחוברת</th>
          <th scope="col">תשובות</th>
        </tr>
      </thead>
      <tbody>
        {originalUnits.map(unit => (
          <tr key={unit}>
            <th scope="row">{unit}</th>
            <td>{unitTitles[unit]}</td>
            <td>{studentPagesPerUnit.get(unit)}</td>
            <td>{answersPerUnit[unit]}</td>
          </tr>
        ))}
        <tr className="teacher-contents-source">
          <th scope="row">5</th>
          <td>{unitTitles[5]}</td>
          <td>{studentPagesPerUnit.get(5)}</td>
          <td>ללא מפתח*</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">סה״כ</th>
          <td />
          <td>{studentPages}</td>
          <td>{answerKeySummary.authoredTotal}</td>
        </tr>
      </tfoot>
    </table>
  );
}

function AnswerCard({ entry, location }: LocatedEntry) {
  return (
    <article className="teacher-answer-card" data-task-id={entry.id} data-position={location.position}>
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
 * Answers of one student page in printed rows: two per row (● 1 | ● 2, then ● 3 | ● 4) in the
 * two-column flow, one per row otherwise. A row is kept whole on one sheet.
 */
function answerRows(items: readonly LocatedEntry[], flow: AnswerFlow): LocatedEntry[][] {
  const size = flow === 'columns' ? 2 : 1;
  const rows: LocatedEntry[][] = [];
  for (let index = 0; index < items.length; index += size) rows.push(items.slice(index, index + size));
  return rows;
}

/** A numeric range such as 1–4, kept in reading order (1 before 4) inside Hebrew text. */
const NumberRange = ({ from, to }: { from: number; to: number }) => (
  <bdi dir="ltr" className="teacher-range">{from}–{to}</bdi>
);

/** The answers of one student page: a heading that says how many ● the page has, then the rows. */
function StudentPageAnswers({ unit, page, items }: { unit: TeacherUnit; page: number; items: LocatedEntry[] }) {
  const flow = answerFlow(items.map(item => item.entry.answer));
  return (
    <section className="teacher-page-group" aria-labelledby={`teacher-u${unit}-p${page}`}>
      <header className="teacher-page-heading">
        <h3 id={`teacher-u${unit}-p${page}`}>
          <span className="teacher-visually-hidden">יחידה {unit}, </span>עמוד {page}
        </h3>
        <p className="teacher-page-count">
          {questionCount(items.length)} בעמוד, ● <NumberRange from={1} to={items.length} /> מלמעלה למטה
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

/** A real answer header, shown on the cover to explain how the guide points at an unnumbered question. */
function LocatorExample() {
  const sample = teacherAnswerKey.map(entry => locateTask(entry.id)).find(location => location.unit === 2 && location.position === 3);
  if (!sample) throw new Error('The cover example needs a third question on a unit 2 page.');
  return (
    <figure className="teacher-locator-example">
      <div className="teacher-locator-sample">
        <AnswerHeader location={sample} kindClassName="teacher-sample-kind" />
        <p className="teacher-answer-stem"><MathText text={sample.stemOpening} /></p>
      </div>
      <figcaption>
        כך נראית כותרת של תשובה במדריך. כאן: {describeLocation(sample)} — הסימן ● השלישי מלמעלה באותו עמוד —
        ומשימה מסוג „{TASK_KIND_LABEL[taskKindById(sample.id)]}”, כפי שהסוג כתוב בדף התלמיד.
      </figcaption>
    </figure>
  );
}

export default function TeacherApp() {
  const units = groupByUnitAndPage(locateEntries(teacherAnswerKey));

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
          <p className="teacher-cover-subtitle">מפתח תשובות ליחידות <NumberRange from={1} to={4} /></p>
        </header>

        <p className="teacher-cover-lead">
          המדריך כולל את התשובות לכל המשימות ביחידות <NumberRange from={1} to={4} />, כולל נימוקים גאומטריים ופתרון המשוואות,
          לפי סדר העמודים והשאלות בחוברת. כל יחידה מתחילה בעמוד חדש, כך שאפשר להדפיס או לצלם יחידה אחת בנפרד.
        </p>

        <ContentsTable />
        <p className="teacher-cover-footnote">
          * ביחידה 5 מובאות {curriculumAnswerKeyPolicy.selectedSourceBlocks} שאלות מתוך תוכנית הלימודים כפי שהן במקור,
          ולשאלות אלה לא צורפו פתרונות.
        </p>

        <section className="teacher-howto" aria-labelledby="teacher-howto-title">
          <h2 id="teacher-howto-title">איך מוצאים את התשובה לשאלה</h2>
          <p>
            בדפי התלמיד אין מספרי שאלות: כל שאלה מתחילה בסימן <span className="teacher-inline-marker">●</span>, וכל סעיף מתחיל בסימן <span className="teacher-inline-marker teacher-inline-marker--sub">•</span>. במדריך כל תשובה
            מסומנת לפי מקום השאלה בעמוד התלמיד — <strong className="teacher-inline-position">● 3</strong> היא השאלה השלישית בעמוד, בספירה מלמעלה למטה.
            לצד המספר מופיעים סוג המשימה, היחידה והעמוד, ומתחת להם מילות הפתיחה של השאלה.
          </p>
          <LocatorExample />
        </section>
      </section>

      {units.map(({ unit, pages }) => (
        <section className="teacher-unit" data-unit={unit} key={unit} aria-labelledby={`teacher-unit-${unit}`}>
          <header className="teacher-unit-heading">
            <p className="teacher-unit-kicker">יחידה {unit}</p>
            <h2 id={`teacher-unit-${unit}`}>{unitTitles[unit]}</h2>
            <p className="teacher-unit-meta">
              {studentPagesPerUnit.get(unit)} עמודים בחוברת · {answersPerUnit[unit]} תשובות
            </p>
          </header>

          {pages.map(({ page, items }) => <StudentPageAnswers key={page} unit={unit} page={page} items={items} />)}
        </section>
      ))}

      <section className="teacher-source-policy" aria-labelledby="teacher-unit-5">
        <header className="teacher-unit-heading">
          <p className="teacher-unit-kicker">יחידה 5</p>
          <h2 id="teacher-unit-5">{unitTitles[5]}</h2>
        </header>
        <p>
          ביחידה 5 מובאות {curriculumAnswerKeyPolicy.selectedSourceBlocks} שאלות מתוך תוכנית הלימודים, בדיוק כפי שהן
          במקור. לשאלות אלה לא צורף מפתח תשובות.
        </p>
      </section>
    </main>
  );
}
