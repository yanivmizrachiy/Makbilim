import { Fragment, type ReactNode } from 'react';
import { MathText } from './components/MathText';
import {
  answerKeySummary,
  curriculumAnswerKeyPolicy,
  teacherAnswerKey,
  type TeacherAnswerEntry,
} from './content/answer-key';
import { TASK_KIND_LABEL, taskKindById } from './content/task-kinds';

const unitTitles: Record<number, string> = {
  1: 'מושגים בסיסיים',
  2: 'תרגילי חישוב',
  3: 'תרגילי הוכחה',
  4: 'משפטים הפוכים',
  5: 'שאלות מתוך תוכנית הלימודים',
};

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

function FieldContent({ field, value }: { field: string; value: unknown }): ReactNode {
  if (field === 'values') {
    if (!isRecord(value)) throw new Error('Answer field "values" must be an object of named quantities.');
    return (
      <ul className="teacher-answer-values">
        {Object.entries(value).map(([name, item]) => <li key={name}><ValueLine name={name} value={item} /></li>)}
      </ul>
    );
  }
  if (Array.isArray(value)) {
    const items = value.map((item, index) => <li key={index}><MathText text={String(item)} /></li>);
    return field === 'proof' || field === 'completions'
      ? <ol className="teacher-answer-list">{items}</ol>
      : <ul className="teacher-answer-list">{items}</ul>;
  }
  return <MathText text={String(value)} />;
}

function AnswerBody({ answer }: { answer: unknown }) {
  if (typeof answer === 'string') return <p className="teacher-answer-text"><MathText text={answer} /></p>;

  if (Array.isArray(answer)) {
    return (
      <ul className="teacher-answer-list">
        {answer.map((item, index) => <li key={index}><MathText text={String(item)} /></li>)}
      </ul>
    );
  }

  if (isRecord(answer)) {
    const unlabelled = Object.keys(answer).filter(field => !FIELD_HEADINGS.has(field));
    if (unlabelled.length) throw new Error(`Answer field(s) without a teacher-facing heading: ${unlabelled.join(', ')}`);
    return (
      <dl className="teacher-answer-fields">
        {ANSWER_FIELDS.filter(([field]) => field in answer).map(([field, heading]) => (
          <Fragment key={field}>
            <dt>{heading}</dt>
            <dd><FieldContent field={field} value={answer[field]} /></dd>
          </Fragment>
        ))}
      </dl>
    );
  }

  throw new Error(`Unsupported answer shape: ${JSON.stringify(answer)}`);
}

function groupByUnitAndPage(entries: TeacherAnswerEntry[]) {
  const groups = new Map<string, TeacherAnswerEntry[]>();
  for (const entry of entries) {
    const key = `${entry.unit}-${entry.page}`;
    const group = groups.get(key) ?? [];
    group.push(entry);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map(items => {
      const first = items[0]!;
      return { unit: first.unit, page: first.page, items };
    })
    .sort((a, b) => a.unit - b.unit || a.page - b.page);
}

export default function TeacherApp() {
  const groups = groupByUnitAndPage(teacherAnswerKey);

  return (
    <main
      className="teacher-document"
      data-teacher-ready="true"
      data-answer-count={answerKeySummary.authoredTotal}
      data-unit5-source-blocks={curriculumAnswerKeyPolicy.selectedSourceBlocks}
      dir="rtl"
    >
      <section className="teacher-cover">
        <div className="teacher-kicker">מפתח תשובות מלא</div>
        <h1>זוויות בין ישרים מקבילים</h1>
        <h2>מדריך למורה</h2>
        <p>
          המדריך כולל את התשובות לכל המשימות ביחידות 1–4, כולל נימוקים גאומטריים ופתרון המשוואות,
          לפי סדר העמודים והשאלות בחוברת. סוג כל משימה מסומן כמו בדף התלמיד.
        </p>
        <div className="teacher-summary-grid">
          <div><strong>{answerKeySummary.unit1}</strong><span>תשובות ביחידה 1</span></div>
          <div><strong>{answerKeySummary.unit2}</strong><span>תשובות ביחידה 2</span></div>
          <div><strong>{answerKeySummary.unit3}</strong><span>תשובות ביחידה 3</span></div>
          <div><strong>{answerKeySummary.unit4}</strong><span>תשובות ביחידה 4</span></div>
        </div>
        <p className="teacher-cover-note">
          סה״כ {answerKeySummary.authoredTotal} תשובות. ביחידה 5 מובאות שאלות מתוך תוכנית הלימודים כפי שהן במקור,
          ולשאלות אלה לא צורפו פתרונות.
        </p>
      </section>

      {groups.map(({ unit, page, items }) => (
        <section className="teacher-page-group" key={`${unit}-${page}`}>
          <header className="teacher-page-heading">
            <div>
              <div className="teacher-unit">יחידה {unit} — {unitTitles[unit]}</div>
              <h2>עמוד {page}</h2>
            </div>
            <div className="teacher-page-count">{items.length} תשובות</div>
          </header>

          <div className="teacher-answer-grid">
            {items.map((entry, index) => (
              <article className="teacher-answer-card" key={entry.id} data-task-id={entry.id}>
                <header>
                  <span className="teacher-answer-order">שאלה {index + 1}</span>
                  <span className="teacher-answer-kind">{TASK_KIND_LABEL[taskKindById(entry.id)]}</span>
                </header>
                <div className="teacher-answer-body">
                  <AnswerBody answer={entry.answer} />
                </div>
                {entry.note ? (
                  <aside className="teacher-answer-note">
                    <strong>הערת מורה:</strong> <MathText text={entry.note} />
                  </aside>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ))}

      <section className="teacher-source-policy">
        <h2>יחידה 5 — {unitTitles[5]}</h2>
        <p>
          ביחידה 5 מובאות {curriculumAnswerKeyPolicy.selectedSourceBlocks} שאלות מתוך תוכנית הלימודים, בדיוק כפי שהן
          במקור. לשאלות אלה לא צורף מפתח תשובות.
        </p>
      </section>
    </main>
  );
}
