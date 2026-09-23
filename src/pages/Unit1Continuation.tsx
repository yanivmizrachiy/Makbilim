import { A4Page } from '../components/A4Page';
import { ClozeText } from '../components/ClozeText';
import { MathText } from '../components/MathText';
import { QuestionBlock } from '../components/QuestionBlock';
import { ParallelLinesDiagram, type AngleMark } from '../geometry/ParallelLinesDiagram';
import { alternateInteriorPairs, correspondingPair, type AnglePair } from '../geometry/relations';
import { unit1Questions } from '../content/questions-unit1';

/** A pair of angles the task text points to ("the marked pair"), drawn with the marked role. */
const markedPair = (pair: AnglePair): AngleMark[] =>
  pair.map(({ intersection, sector }) => ({ intersection, sector, role: 'marked' as const }));

/** The alternate pair BETWEEN the two lines, computed from the drawing's own geometry. */
function alternateInteriorPair(lineDeg: number, transversalDeg: number): AnglePair {
  const pair = alternateInteriorPairs(lineDeg, transversalDeg)[0];
  if (!pair) throw new Error(`No alternate interior pair for line ${lineDeg}° / transversal ${transversalDeg}°`);
  return pair;
}

const byId = (id: string) => {
  const q = unit1Questions.find(item => item.id === id);
  if (!q) throw new Error(`Missing unit 1 question: ${id}`);
  return q;
};

// Angle names go through MathText so each is one LTR math island; as plain text inside the
// RTL column the neutral "∠" would be placed after the digit ("1∠").
const RIGHT_COLUMN_ANGLES = ['∠1', '∠2', '∠3', '∠4'];
const LEFT_COLUMN_ANGLES = ['∠5', '∠6', '∠7', '∠8'];

function MatchingColumns({ mode }: { mode: 'corresponding' | 'alternate' }) {
  return (
    <div className="matching-columns">
      <div><strong>טור ימני</strong>{RIGHT_COLUMN_ANGLES.map(angle => <span key={angle}><MathText text={angle} /></span>)}</div>
      <div><strong>טור שמאלי</strong>{LEFT_COLUMN_ANGLES.map(angle => <span key={angle}><MathText text={angle} /></span>)}</div>
      <span className="sr-only">{mode === 'corresponding' ? 'התאמת זוויות מתאימות' : 'התאמת זוויות מתחלפות'}</span>
    </div>
  );
}

function EightAngleDiagram({
  lineLabels,
  transversalLabel,
  orientationDeg,
  transversalDeg,
}: {
  lineLabels: [string, string];
  transversalLabel: string;
  orientationDeg: number;
  transversalDeg: number;
}) {
  return (
    <ParallelLinesDiagram
      lineLabels={lineLabels}
      transversalLabel={transversalLabel}
      orientationDeg={orientationDeg}
      transversalDeg={transversalDeg}
      showParallelMarks={false}
      angleMarks={[
        { intersection: 'top', sector: 0, label: '1', role: 'marked' },
        { intersection: 'top', sector: 1, label: '2', role: 'marked' },
        { intersection: 'top', sector: 2, label: '3', role: 'marked' },
        { intersection: 'top', sector: 3, label: '4', role: 'marked' },
        { intersection: 'bottom', sector: 0, label: '5', role: 'marked' },
        { intersection: 'bottom', sector: 1, label: '6', role: 'marked' },
        { intersection: 'bottom', sector: 2, label: '7', role: 'marked' },
        { intersection: 'bottom', sector: 3, label: '8', role: 'marked' },
      ]}
    />
  );
}

// Theorem-completion lines sit beside the reference diagram (in the stem column of
// the split layout) and keep the canonical small-bullet subpart markers.
function ClozeLines({ lines }: { lines: string[] }) {
  return (
    <div className="subparts">
      {lines.map((line, index) => (
        <div className="subpart" key={index}>
          <span className="subpart-marker" aria-hidden="true">•</span>
          <div className="subpart-content"><ClozeText text={line} /></div>
        </div>
      ))}
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
  const corresponding = byId('U1-P1-E');
  const alternate = byId('U1-P2-A');
  const rotated = byId('U1-P2-B');
  const theorem = byId('U1-P2-C');

  return (
    <A4Page unitNumber={1} unitTitle="מושגים בסיסיים" pageNumber={2}>
      <QuestionBlock
        taskId={corresponding.id}
        compact
        diagram={<EightAngleDiagram lineLabels={['c', 'd']} transversalLabel="h" orientationDeg={-3} transversalDeg={52} />}
      >
        {corresponding.stem}
        <MatchingColumns mode="corresponding" />
      </QuestionBlock>

      <QuestionBlock
        taskId={alternate.id}
        compact
        diagram={<EightAngleDiagram lineLabels={['g', 'j']} transversalLabel="n" orientationDeg={19} transversalDeg={95} />}
      >
        {alternate.stem}
        <MatchingColumns mode="alternate" />
      </QuestionBlock>

      <QuestionBlock
        taskId={rotated.id}
        compact
        diagram={<EightAngleDiagram lineLabels={['ℓ₁', 'ℓ₂']} transversalLabel="r" orientationDeg={78} transversalDeg={21} />}
        subparts={(rotated.subparts ?? []).map(text => <>{text} ______________________________</>)}
      >
        {rotated.stem}
      </QuestionBlock>

      <QuestionBlock
        taskId={theorem.id}
        compact
        diagram={<ParallelLinesDiagram lineLabels={['e', 'f']} transversalLabel="z" orientationDeg={8} transversalDeg={138} showParallelMarks angleMarks={markedPair(correspondingPair(0))} />}
      >
        {theorem.stem}
        <ClozeLines lines={theorem.subparts ?? []} />
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
    transversalDeg: 131,
    parallel: true,
    relation: 'מתאימות',
    equalityConclusion: 'כן',
    marks: [
      { intersection: 'top', sector: 0, role: 'marked' },
      { intersection: 'bottom', sector: 0, role: 'marked' },
    ],
  },
  {
    orientationDeg: 31,
    transversalDeg: 107,
    parallel: false,
    relation: 'מתאימות',
    equalityConclusion: 'לא ניתן לקבוע',
    marks: [
      { intersection: 'top', sector: 1, role: 'marked' },
      { intersection: 'bottom', sector: 1, role: 'marked' },
    ],
  },
  {
    orientationDeg: 82,
    transversalDeg: 27,
    parallel: true,
    relation: 'מתחלפות',
    equalityConclusion: 'כן',
    marks: [
      { intersection: 'top', sector: 2, role: 'marked' },
      { intersection: 'bottom', sector: 0, role: 'marked' },
    ],
  },
  {
    orientationDeg: -18,
    transversalDeg: 112,
    parallel: false,
    relation: 'מתחלפות',
    equalityConclusion: 'לא ניתן לקבוע',
    marks: [
      { intersection: 'top', sector: 0, role: 'marked' },
      { intersection: 'bottom', sector: 2, role: 'marked' },
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
  const theorem = byId('U1-P2-D');
  const trueFalse = byId('U1-P2-E');
  const claim = byId('U1-P3-A');

  return (
    <A4Page unitNumber={1} unitTitle="מושגים בסיסיים" pageNumber={3}>
      <QuestionBlock
        taskId={theorem.id}
        compact
        diagram={<ParallelLinesDiagram lineLabels={['x', 'y']} transversalLabel="v" orientationDeg={-14} transversalDeg={109} showParallelMarks angleMarks={markedPair(alternateInteriorPair(-14, 109))} />}
      >
        {theorem.stem}
        <ClozeLines lines={theorem.subparts ?? []} />
      </QuestionBlock>

      <QuestionBlock taskId={trueFalse.id}>
        {trueFalse.stem}
        <div className="true-false-list">
          {(trueFalse.subparts ?? []).map((text, index) => <TrueFalseRow key={index} text={text} />)}
        </div>
      </QuestionBlock>

      <QuestionBlock
        taskId={claim.id}
        answerLines={4}
        diagram={
          <div className="paired-diagrams">
            <ParallelLinesDiagram lineLabels={['m', 'n']} transversalLabel="q" orientationDeg={13} transversalDeg={63} showParallelMarks angleMarks={markedPair(alternateInteriorPair(13, 63))} />
            <ParallelLinesDiagram lineLabels={['m', 'n']} transversalLabel="q" orientationDeg={-9} transversalDeg={131} showParallelMarks={false} secondLineSkewDeg={8} angleMarks={markedPair(alternateInteriorPair(-9, 131))} />
          </div>
        }
      >
        {claim.stem}
      </QuestionBlock>
    </A4Page>
  );
}

function Unit1Page4() {
  const table = byId('U1-P3-B');
  const choice = byId('U1-P3-C');
  const correction = byId('U1-P3-D');

  return (
    <A4Page unitNumber={1} unitTitle="מושגים בסיסיים" pageNumber={4}>
      <QuestionBlock taskId={table.id} compact subparts={(table.subparts ?? []).map(text => <>{text}</>)}>
        {table.stem}
        <RelationTable />
      </QuestionBlock>

      <QuestionBlock
        taskId={choice.id}
        compact
        diagram={
          <ParallelLinesDiagram
            lineLabels={['b', 'd']}
            transversalLabel="f"
            orientationDeg={84}
            transversalDeg={151}
            showParallelMarks={false}
            angleMarks={[
              { intersection: 'top', sector: 0, label: 'א', role: 'marked' },
              { intersection: 'bottom', sector: 1, label: 'א', role: 'marked' },
              { intersection: 'top', sector: 1, label: 'ב', role: 'marked' },
              { intersection: 'bottom', sector: 2, label: 'ב', role: 'marked' },
              { intersection: 'top', sector: 2, label: 'ג', role: 'marked' },
              { intersection: 'bottom', sector: 0, label: 'ג', role: 'marked' },
              { intersection: 'top', sector: 3, label: 'ד', role: 'marked' },
              { intersection: 'bottom', sector: 3, label: 'ד', role: 'marked' },
            ]}
          />
        }
      >
        {choice.stem}
        <div className="choice-grid">
          {(choice.choices ?? []).map(item => <div className="choice" key={item}>{item}</div>)}
        </div>
      </QuestionBlock>

      <QuestionBlock
        taskId={correction.id}
        compact
        answerLines={4}
        diagram={
          <div className="paired-diagrams">
            <ParallelLinesDiagram lineLabels={['h', 'k']} transversalLabel="s" orientationDeg={-21} transversalDeg={48} showParallelMarks angleMarks={markedPair(correspondingPair(0))} />
            <ParallelLinesDiagram lineLabels={['h', 'k']} transversalLabel="s" orientationDeg={16} transversalDeg={54} showParallelMarks={false} secondLineSkewDeg={-8} angleMarks={markedPair(correspondingPair(0))} />
          </div>
        }
      >
        {correction.stem}
      </QuestionBlock>
    </A4Page>
  );
}

export function Unit1Continuation() {
  return <><Unit1Page2 /><Unit1Page3 /><Unit1Page4 /></>;
}
