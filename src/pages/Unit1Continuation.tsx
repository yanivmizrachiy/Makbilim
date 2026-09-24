import { A4Page } from '../components/A4Page';
import { ClozeText } from '../components/ClozeText';
import { MathText } from '../components/MathText';
import { ClaimComic } from '../components/ClaimComic';
import { QuestionBlock } from '../components/QuestionBlock';
import { ChoiceGrid, ItemRows, LineSlot, VerdictOptions, WordBank } from '../components/ResponseParts';
import { answerSpecById } from '../content/answer-areas';
import { ParallelLinesDiagram, type AngleMark } from '../geometry/ParallelLinesDiagram';
import { alternateInteriorPairs, coInteriorPair, correspondingPair, type AnglePair } from '../geometry/relations';
import { PARALLEL_ARROWS_CONVENTION, PARALLEL_ARROWS_TABLE_HINT, unit1Questions } from '../content/questions-unit1';

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

// The alternate-angle task is sentence-completion (each line gives a top angle 1–4 and blanks its
// alternate), a different format from the two-column match of U1-P1-E right before it.
const ALTERNATE_COMPLETION_LINES = [
  'זווית 1 מתחלפת לזווית ___',
  'זווית 2 מתחלפת לזווית ___',
  'זווית 3 מתחלפת לזווית ___',
  'זווית 4 מתחלפת לזווית ___',
];

function CompletionLines() {
  return (
    <div className="completion-list">
      {ALTERNATE_COMPLETION_LINES.map((line, index) => (
        <div className="completion-line" key={index}><ClozeText text={line} /></div>
      ))}
    </div>
  );
}

type SectorLabels = readonly [string, string, string, string];

/**
 * Numbers of the four angles at the bottom crossing, by sector 0–3 (the top crossing is always
 * 1–4 in sector order). Each task scrambles them differently, so that no correct pair sits on
 * one row of the printed columns (∠1…∠4 against ∠5…∠8): the student must match by POSITION.
 *  - U1-P1-E corresponding (top k ↔ bottom k):        1↔7, 2↔5, 3↔8, 4↔6
 *  - U1-P2-A alternate (top k ↔ bottom (k + 2) % 4):   1↔6, 2↔5, 3↔8, 4↔7
 *  - U1-P2-B (student's own pairs):                    corresponding 1↔6, alternate 1↔5
 */
export const UNIT1_BOTTOM_LABELS: Readonly<Record<'U1-P1-E' | 'U1-P2-A' | 'U1-P2-B', SectorLabels>> = {
  'U1-P1-E': ['7', '5', '8', '6'],
  'U1-P2-A': ['8', '7', '6', '5'],
  'U1-P2-B': ['6', '8', '5', '7'],
};

function EightAngleDiagram({
  lineLabels,
  transversalLabel,
  orientationDeg,
  transversalDeg,
  bottomLabels,
}: {
  lineLabels: [string, string];
  transversalLabel: string;
  orientationDeg: number;
  transversalDeg: number;
  bottomLabels: SectorLabels;
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
        ...([0, 1, 2, 3] as const).map(sector => ({ intersection: 'bottom' as const, sector, label: bottomLabels[sector], role: 'marked' as const })),
      ]}
    />
  );
}

// Theorem-completion lines: each is a sub-item (•) with its blank written in place.
const clozeItems = (lines: string[]) => lines.map(line => ({ content: <ClozeText text={line} /> }));

function Unit1Page2() {
  const corresponding = byId('U1-P1-E');
  const alternate = byId('U1-P2-A');
  const rotated = byId('U1-P2-B');
  const theorem = byId('U1-P2-C');

  return (
    <A4Page pageId="U1-P2">
      <QuestionBlock
        taskId={corresponding.id}
        diagram={<EightAngleDiagram lineLabels={['c', 'd']} transversalLabel="h" orientationDeg={-3} transversalDeg={52} bottomLabels={UNIT1_BOTTOM_LABELS['U1-P1-E']} />}
      >
        {corresponding.stem}
        <MatchingColumns mode="corresponding" />
      </QuestionBlock>

      <QuestionBlock
        taskId={alternate.id}
        diagram={<EightAngleDiagram lineLabels={['g', 'j']} transversalLabel="n" orientationDeg={19} transversalDeg={95} bottomLabels={UNIT1_BOTTOM_LABELS['U1-P2-A']} />}
      >
        {alternate.stem}
        <CompletionLines />
      </QuestionBlock>

      <QuestionBlock
        taskId={rotated.id}
        diagram={<EightAngleDiagram lineLabels={['ℓ₁', 'ℓ₂']} transversalLabel="r" orientationDeg={78} transversalDeg={21} bottomLabels={UNIT1_BOTTOM_LABELS['U1-P2-B']} />}
        items={(rotated.subparts ?? []).map((text, index, all) =>
          index < all.length - 1 ? { content: <>{text}<LineSlot /></>, inline: true } : { content: text })}
      >
        {rotated.stem}
      </QuestionBlock>

      <QuestionBlock
        taskId={theorem.id}
        hint={PARALLEL_ARROWS_CONVENTION}
        diagram={<ParallelLinesDiagram lineLabels={['e', 'f']} transversalLabel="z" orientationDeg={8} transversalDeg={138} showParallelMarks angleMarks={markedPair(correspondingPair(0))} />}
        items={clozeItems(theorem.subparts ?? [])}
      >
        {theorem.stem}
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
      <colgroup><col className="col-figure" /><col className="col-answer" /><col className="col-answer" /></colgroup>
      <thead><tr><th>שרטוט</th><th>סוג הזוג: מתאימות או מתחלפות?</th><th>האם ניתן לקבוע שהזוויות שוות?</th></tr></thead>
      <tbody>
        {unit1RelationTableCases.map((item, index) => (
          <tr key={index}>
            <td>
              <ParallelLinesDiagram
                size="table"
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
    <A4Page pageId="U1-P3">
      <QuestionBlock
        taskId={theorem.id}
        diagram={<ParallelLinesDiagram lineLabels={['x', 'y']} transversalLabel="v" orientationDeg={-14} transversalDeg={109} showParallelMarks angleMarks={markedPair(alternateInteriorPair(-14, 109))} />}
        items={clozeItems(theorem.subparts ?? [])}
      >
        {theorem.stem}
      </QuestionBlock>

      <QuestionBlock
        taskId={trueFalse.id}
        items={(trueFalse.subparts ?? []).map(text => ({
          content: text,
          aside: <VerdictOptions options={trueFalse.verdictOptions ?? []} />,
          after: <ItemRows label="נימוק:" rows={answerSpecById(trueFalse.id).itemRows ?? 1} />,
        }))}
      >
        {trueFalse.stem}
      </QuestionBlock>

      <QuestionBlock
        taskId={claim.id}
        diagramLayout="stacked"
        comic={claim.comic && <ClaimComic speakers={claim.comic} />}
        diagram={
          <div className="paired-diagrams">
            <ParallelLinesDiagram size="pair" lineLabels={['m', 'n']} transversalLabel="q" orientationDeg={13} transversalDeg={63} showParallelMarks angleMarks={markedPair(alternateInteriorPair(13, 63))} />
            <ParallelLinesDiagram size="pair" lineLabels={['m', 'n']} transversalLabel="q" orientationDeg={-9} transversalDeg={131} showParallelMarks={false} secondLineSkewDeg={8} angleMarks={markedPair(alternateInteriorPair(-9, 131))} />
          </div>
        }
      >
        <MathText text={claim.stem} />
      </QuestionBlock>
    </A4Page>
  );
}

function Unit1Page4() {
  const table = byId('U1-P3-B');
  const choice = byId('U1-P3-C');
  const correction = byId('U1-P3-D');

  return (
    <A4Page pageId="U1-P4">
      <QuestionBlock taskId={table.id} hint={PARALLEL_ARROWS_TABLE_HINT} response={<RelationTable />}>
        {table.stem}
      </QuestionBlock>

      <QuestionBlock
        taskId={choice.id}
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
        <ChoiceGrid options={choice.choices ?? []} />
      </QuestionBlock>

      <QuestionBlock
        taskId={correction.id}
        diagramLayout="stacked"
        diagram={
          <div className="paired-diagrams">
            <ParallelLinesDiagram size="pair" lineLabels={['h', 'k']} transversalLabel="s" orientationDeg={-21} transversalDeg={48} showParallelMarks angleMarks={markedPair(correspondingPair(0))} />
            <ParallelLinesDiagram size="pair" lineLabels={['h', 'k']} transversalLabel="s" orientationDeg={16} transversalDeg={54} showParallelMarks={false} secondLineSkewDeg={-8} angleMarks={markedPair(correspondingPair(0))} />
          </div>
        }
      >
        {correction.stem}
      </QuestionBlock>
    </A4Page>
  );
}

const DEFINITION_BANK = ['משותפות', 'מקבילים'];

/**
 * The opening didactic page (SPEC 3.5 / 4.3): the definitions of parallel lines and segments, the
 * eight angles a transversal forms, the one-sided (co-interior) theorem, and a true/false pass that
 * separates "supplementary to 180°" from "equal". Placed first among the authored topics in the
 * booklet (App renders it before Unit1Page1).
 */
export function Unit1Page5() {
  const def = byId('U1-P5-A');
  const eight = byId('U1-P5-B');
  const cointerior = byId('U1-P5-C');
  const trueFalse = byId('U1-P5-D');

  // The eight angles: all four sectors at each crossing, numbered 1–8.
  const eightMarks: AngleMark[] = [
    ...([0, 1, 2, 3] as const).map(sector => ({ intersection: 'top' as const, sector, label: String(sector + 1), role: 'marked' as const })),
    ...([0, 1, 2, 3] as const).map(sector => ({ intersection: 'bottom' as const, sector, label: String(sector + 5), role: 'marked' as const })),
  ];

  return (
    <A4Page pageId="U1-P5">
      <QuestionBlock
        taskId={def.id}
        diagram={<ParallelLinesDiagram lineLabels={['a', 'b']} transversalLabel="c" orientationDeg={-2} transversalDeg={136} showParallelMarks ariaLabel="שני ישרים מקבילים וישר החותך אותם, להמחשת ההגדרה" />}
        items={clozeItems(def.subparts ?? [])}
      >
        {def.stem}
        <WordBank items={DEFINITION_BANK} />
      </QuestionBlock>

      <QuestionBlock
        taskId={eight.id}
        diagram={<ParallelLinesDiagram lineLabels={['p', 'q']} transversalLabel="t" orientationDeg={-4} transversalDeg={116} showParallelMarks angleMarks={eightMarks} ariaLabel="שמונה הזוויות שנוצרו בשני המפגשים של החותך עם הישרים המקבילים" />}
      >
        {eight.stem}
      </QuestionBlock>

      <QuestionBlock
        taskId={cointerior.id}
        hint={PARALLEL_ARROWS_CONVENTION}
        diagram={<ParallelLinesDiagram lineLabels={['k', 'm']} transversalLabel="r" orientationDeg={-11} transversalDeg={59} showParallelMarks angleMarks={markedPair(coInteriorPair(-11, 59))} />}
        items={clozeItems(cointerior.subparts ?? [])}
      >
        {cointerior.stem}
      </QuestionBlock>

      <QuestionBlock
        taskId={trueFalse.id}
        items={(trueFalse.subparts ?? []).map(text => ({
          // Each claim goes through MathText, so any mathematics in it is typeset as an island.
          content: <MathText text={text} />,
          aside: <VerdictOptions options={trueFalse.verdictOptions ?? []} />,
          after: <ItemRows label="נימוק:" rows={answerSpecById(trueFalse.id).itemRows ?? 1} />,
        }))}
      >
        {trueFalse.stem}
      </QuestionBlock>
    </A4Page>
  );
}

export function Unit1Continuation() {
  return <><Unit1Page2 /><Unit1Page3 /><Unit1Page4 /></>;
}
