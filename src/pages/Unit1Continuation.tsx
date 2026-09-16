import React from 'react';
import { A4Page } from '../components/A4Page';
import { QuestionBlock } from '../components/QuestionBlock';
import { ParallelLinesDiagram, type AngleMark } from '../geometry/ParallelLinesDiagram';
import { unit1Questions } from '../content/questions-unit1';

const byId = (id: string) => {
  const q = unit1Questions.find(item => item.id === id);
  if (!q) throw new Error(`Missing unit 1 question: ${id}`);
  return q;
};

function MatchingColumns({ mode }: { mode: 'corresponding' | 'alternate' }) {
  return (
    <div className="matching-columns">
      <div><strong>טור ימני</strong><span>∠1</span><span>∠2</span><span>∠3</span><span>∠4</span></div>
      <div><strong>טור שמאלי</strong><span>∠5</span><span>∠6</span><span>∠7</span><span>∠8</span></div>
      <span className="sr-only">{mode === 'corresponding' ? 'התאמת זוויות מתאימות' : 'התאמת זוויות מתחלפות'}</span>
    </div>
  );
}

function TrueFalseRow({ text }: { text: string }) {
  return (
    <div className="true-false-row">
      <span>{text}</span>
      <span className="true-false-options">○ נכון&nbsp;&nbsp;&nbsp;○ לא נכון</span>
    </div>
  );
}

function Unit1Page2() {
  const a = byId('U1-P2-A');
  const b = byId('U1-P2-B');
  const c = byId('U1-P2-C');
  const d = byId('U1-P2-D');
  const e = byId('U1-P2-E');

  return (
    <A4Page unitNumber={1} unitTitle="מושגים בסיסיים" pageNumber={2}>
      <QuestionBlock
        compact
        diagram={
          <ParallelLinesDiagram
            lineLabels={['g', 'j']}
            transversalLabel="n"
            orientationDeg={19}
            transversalDeg={101}
            showParallelMarks={false}
            angleMarks={[
              { intersection: 'top', sector: 0, label: '1', tone: 'neutral' },
              { intersection: 'top', sector: 1, label: '2', tone: 'neutral' },
              { intersection: 'top', sector: 2, label: '3', tone: 'neutral' },
              { intersection: 'top', sector: 3, label: '4', tone: 'neutral' },
              { intersection: 'bottom', sector: 0, label: '5', tone: 'neutral' },
              { intersection: 'bottom', sector: 1, label: '6', tone: 'neutral' },
              { intersection: 'bottom', sector: 2, label: '7', tone: 'neutral' },
              { intersection: 'bottom', sector: 3, label: '8', tone: 'neutral' },
            ]}
          />
        }
      >
        {a.stem}
        <MatchingColumns mode="alternate" />
      </QuestionBlock>

      <QuestionBlock
        compact
        diagram={
          <ParallelLinesDiagram
            lineLabels={['ℓ₁', 'ℓ₂']}
            transversalLabel="r"
            orientationDeg={78}
            transversalDeg={24}
            showParallelMarks={false}
            angleMarks={[
              { intersection: 'top', sector: 0, label: '1', tone: 'neutral' },
              { intersection: 'top', sector: 1, label: '2', tone: 'neutral' },
              { intersection: 'top', sector: 2, label: '3', tone: 'neutral' },
              { intersection: 'top', sector: 3, label: '4', tone: 'neutral' },
              { intersection: 'bottom', sector: 0, label: '5', tone: 'neutral' },
              { intersection: 'bottom', sector: 1, label: '6', tone: 'neutral' },
              { intersection: 'bottom', sector: 2, label: '7', tone: 'neutral' },
              { intersection: 'bottom', sector: 3, label: '8', tone: 'neutral' },
            ]}
          />
        }
        subparts={(b.subparts ?? []).map(text => <>{text} ______________________________</>)}
      >
        {b.stem}
      </QuestionBlock>

      <QuestionBlock compact answerLines={1} diagram={<ParallelLinesDiagram lineLabels={['e', 'f']} transversalLabel="z" orientationDeg={8} transversalDeg={67} showParallelMarks />}>
        {c.stem}
      </QuestionBlock>

      <QuestionBlock compact answerLines={1} diagram={<ParallelLinesDiagram lineLabels={['x', 'y']} transversalLabel="v" orientationDeg={-14} transversalDeg={109} showParallelMarks />}>
        {d.stem}
      </QuestionBlock>

      <QuestionBlock compact>
        {e.stem}
        <div className="true-false-list">
          {(e.subparts ?? []).map((text, index) => <TrueFalseRow key={index} text={text} />)}
        </div>
      </QuestionBlock>
    </A4Page>
  );
}

export const unit1RelationTableCases: Array<{
  orientationDeg: number;
  transversalDeg: number;
  parallel: boolean;
  relation: 'מתאימות' | 'מתחלפות';
  equalityConclusion: 'כן' | 'לא ניתן לקבוע';
  marks: AngleMark[];
}> = [
  {
    orientationDeg: 0,
    transversalDeg: 59,
    parallel: true,
    relation: 'מתאימות',
    equalityConclusion: 'כן',
    marks: [
      { intersection: 'top', sector: 0, tone: 'primary' },
      { intersection: 'bottom', sector: 0, tone: 'primary' },
    ],
  },
  {
    orientationDeg: 31,
    transversalDeg: 122,
    parallel: false,
    relation: 'מתאימות',
    equalityConclusion: 'לא ניתן לקבוע',
    marks: [
      { intersection: 'top', sector: 1, tone: 'primary' },
      { intersection: 'bottom', sector: 1, tone: 'primary' },
    ],
  },
  {
    orientationDeg: 82,
    transversalDeg: 27,
    parallel: true,
    relation: 'מתחלפות',
    equalityConclusion: 'כן',
    marks: [
      { intersection: 'top', sector: 2, tone: 'primary' },
      { intersection: 'bottom', sector: 0, tone: 'primary' },
    ],
  },
  {
    orientationDeg: -18,
    transversalDeg: 51,
    parallel: false,
    relation: 'מתחלפות',
    equalityConclusion: 'לא ניתן לקבוע',
    marks: [
      { intersection: 'top', sector: 0, tone: 'primary' },
      { intersection: 'bottom', sector: 2, tone: 'primary' },
    ],
  },
];

function RelationTable() {
  return (
    <table className="data-table relation-table">
      <thead><tr><th>שרטוט</th><th>סוג הזוג</th><th>האם ניתן לקבוע שהזוויות שוות?</th></tr></thead>
      <tbody>
        {unit1RelationTableCases.map((item, index) => (
          <tr key={index}>
            <td>
              <ParallelLinesDiagram
                lineLabels={['a', 'c']}
                transversalLabel="p"
                orientationDeg={item.orientationDeg}
                transversalDeg={item.transversalDeg}
                showParallelMarks={item.parallel}
                angleMarks={item.marks}
              />
            </td>
            <td className="write-cell" />
            <td className="write-cell" />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Unit1Page3() {
  const a = byId('U1-P3-A');
  const b = byId('U1-P3-B');

  return (
    <A4Page unitNumber={1} unitTitle="מושגים בסיסיים" pageNumber={3}>
      <QuestionBlock
        answerLines={3}
        diagram={
          <div className="paired-diagrams">
            <ParallelLinesDiagram lineLabels={['m', 'n']} transversalLabel="q" orientationDeg={13} transversalDeg={73} showParallelMarks />
            <ParallelLinesDiagram lineLabels={['m', 'n']} transversalLabel="q" orientationDeg={-9} transversalDeg={68} showParallelMarks={false} />
          </div>
        }
      >
        {a.stem}
      </QuestionBlock>

      <QuestionBlock subparts={(b.subparts ?? []).map(text => <>{text}</>)}>
        {b.stem}
        <RelationTable />
      </QuestionBlock>
    </A4Page>
  );
}

function Unit1Page4() {
  const c = byId('U1-P3-C');
  const d = byId('U1-P3-D');

  return (
    <A4Page unitNumber={1} unitTitle="מושגים בסיסיים" pageNumber={4}>
      <QuestionBlock
        diagram={
          <ParallelLinesDiagram
            lineLabels={['b', 'd']}
            transversalLabel="f"
            orientationDeg={84}
            transversalDeg={29}
            showParallelMarks={false}
            angleMarks={[
              { intersection: 'top', sector: 0, label: 'א', tone: 'primary' },
              { intersection: 'bottom', sector: 1, label: 'א', tone: 'primary' },
              { intersection: 'top', sector: 1, label: 'ב', tone: 'secondary' },
              { intersection: 'bottom', sector: 1, label: 'ב', tone: 'secondary' },
              { intersection: 'top', sector: 2, label: 'ג', tone: 'neutral' },
              { intersection: 'bottom', sector: 0, label: 'ג', tone: 'neutral' },
              { intersection: 'top', sector: 3, label: 'ד', tone: 'primary', arcStyle: 'double' },
              { intersection: 'bottom', sector: 3, label: 'ד', tone: 'primary', arcStyle: 'double' },
            ]}
          />
        }
      >
        {c.stem}
        <div className="choice-grid">
          {(c.choices ?? []).map(choice => <div className="choice" key={choice}>{choice}</div>)}
        </div>
      </QuestionBlock>

      <QuestionBlock
        answerLines={5}
        diagram={
          <div className="paired-diagrams">
            <ParallelLinesDiagram lineLabels={['h', 'k']} transversalLabel="s" orientationDeg={-21} transversalDeg={48} showParallelMarks />
            <ParallelLinesDiagram lineLabels={['h', 'k']} transversalLabel="s" orientationDeg={16} transversalDeg={62} showParallelMarks={false} />
          </div>
        }
      >
        {d.stem}
      </QuestionBlock>
    </A4Page>
  );
}

export function Unit1Continuation() {
  return <><Unit1Page2 /><Unit1Page3 /><Unit1Page4 /></>;
}
