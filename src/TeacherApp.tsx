import React from 'react';
import { MathText } from './components/MathText';
import {
  answerKeySummary,
  curriculumAnswerKeyPolicy,
  teacherAnswerKey,
  type TeacherAnswerEntry,
} from './content/answer-key';

const unitTitles: Record<number, string> = {
  1: 'מושגים בסיסיים',
  2: 'תרגילי חישוב',
  3: 'תרגילי הוכחה',
  4: 'משפטים הפוכים',
  5: 'שאלות מתוך תוכנית הלימודים',
};

const fieldLabels: Record<string, string> = {
  answer: 'תשובה',
  values: 'ערכים',
  value: 'ערך',
  reason: 'נימוק',
  reasons: 'נימוקים',
  justification: 'הצדקה',
  conclusion: 'מסקנה',
  theorem: 'משפט',
  theoremId: 'משפט',
  angle: 'זווית',
  x: 'x',
  y: 'y',
};

function AnswerValue({ value }: { value: unknown }) {
  if (value == null) return <span>—</span>;

  if (typeof value === 'string') {
    return <MathText text={value} />;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return <MathText text={String(value)} />;
  }

  if (Array.isArray(value)) {
    return (
      <ul className="teacher-answer-list">
        {value.map((item, index) => (
          <li key={index}><AnswerValue value={item} /></li>
        ))}
      </ul>
    );
  }

  if (typeof value === 'object') {
    return (
      <dl className="teacher-answer-object">
        {Object.entries(value as Record<string, unknown>).map(([key, item]) => (
          <React.Fragment key={key}>
            <dt>{fieldLabels[key] ?? key}</dt>
            <dd><AnswerValue value={item} /></dd>
          </React.Fragment>
        ))}
      </dl>
    );
  }

  return <span>{String(value)}</span>;
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
        <div className="teacher-kicker">מפתח תשובות מאומת</div>
        <h1>זוויות בין ישרים מקבילים</h1>
        <h2>מדריך למורה</h2>
        <p>
          המפתח מופק ישירות ממקור האמת <bdi dir="ltr">answer-key.ts</bdi>
          {' '}ומכסה את יחידות 1–4 בלבד.
        </p>
        <div className="teacher-summary-grid">
          <div><strong>{answerKeySummary.unit1}</strong><span>תשובות ביחידה 1</span></div>
          <div><strong>{answerKeySummary.unit2}</strong><span>תשובות ביחידה 2</span></div>
          <div><strong>{answerKeySummary.unit3}</strong><span>תשובות ביחידה 3</span></div>
          <div><strong>{answerKeySummary.unit4}</strong><span>תשובות ביחידה 4</span></div>
        </div>
        <p className="teacher-cover-note">
          סה״כ {answerKeySummary.authoredTotal} תשובות למשימות המקוריות.
          יחידה 5 נשמרת בנאמנות למקור ואינה מקבלת פתרונות מומצאים.
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
              <article className="teacher-answer-card" key={entry.id}>
                <header>
                  <span className="teacher-answer-order">שאלה {index + 1}</span>
                  <bdi className="teacher-answer-id" dir="ltr">{entry.id}</bdi>
                </header>
                <div className="teacher-answer-body">
                  <AnswerValue value={entry.answer} />
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
        <h2>יחידה 5 — מדיניות פתרונות</h2>
        <p>{curriculumAnswerKeyPolicy.rule}</p>
        <dl>
          <dt>מקור</dt>
          <dd><bdi dir="ltr">{curriculumAnswerKeyPolicy.sourceRepository}</bdi></dd>
          <dt>בלוקי מקור</dt>
          <dd>{curriculumAnswerKeyPolicy.selectedSourceBlocks}</dd>
          <dt>סטטוס</dt>
          <dd><bdi dir="ltr">{curriculumAnswerKeyPolicy.status}</bdi></dd>
        </dl>
      </section>
    </main>
  );
}
