import { A4Page } from '../components/A4Page';
import { MathText } from '../components/MathText';
import { QuestionBlock } from '../components/QuestionBlock';
import { ChoiceGrid, LineSlot, WordBank } from '../components/ResponseParts';
import { PROOF_FORM_HEADINGS } from '../content/answer-areas';
import { CLOZE_BLANK } from '../content/cloze';
import { taskFormatById } from '../content/task-kinds';
import { ParallelLinesDiagram, type AngleMark } from '../geometry/ParallelLinesDiagram';
import { alternatePair, correspondingPair, type Sector } from '../geometry/relations';
import { unit3Questions, type Unit3Question } from '../content/questions-unit3';

function proofMarks(q: Unit3Question): AngleMark[] {
  const o = q.diagram.orientationDeg;
  const t = q.diagram.transversalDeg ?? 62;
  const corr = (seed: Sector = 0) => correspondingPair(seed);
  const alt = (seed = 0) => alternatePair(o, t, seed);

  switch (q.id) {
    case 'U3-P1-A': {
      const [a, b] = corr(0);
      return [{ ...a, label: 'A', tone: 'primary' }, { ...b, label: 'B', tone: 'primary' }];
    }
    case 'U3-P1-B': {
      const [a, b] = corr(1);
      return [{ ...a, label: 'C', tone: 'primary' }, { ...b, label: 'D', tone: 'primary' }];
    }
    case 'U3-P1-C': {
      // Corresponding ∠A/∠B and alternate ∠C/∠D on s (four different angles), and the
      // vertical pair ∠E/∠F at the lower crossing of the second transversal t.
      const [ca, cb] = corr(1);
      const [aa, ab] = alt(0);
      return [
        { ...ca, label: 'A', tone: 'primary' }, { ...cb, label: 'B', tone: 'primary' },
        { ...aa, label: 'C', tone: 'secondary' }, { ...ab, label: 'D', tone: 'secondary' },
        { intersection: 'bottom-secondary', sector: 0, label: 'E', tone: 'neutral', arcStyle: 'double' },
        { intersection: 'bottom-secondary', sector: 2, label: 'F', tone: 'neutral', arcStyle: 'double' },
      ];
    }
    case 'U3-P1-D':
    case 'U3-P3-A':
    case 'U3-P3-D': {
      const [a, b] = corr(0);
      return [
        { ...a, label: 'A', tone: 'primary' },
        { ...b, label: 'B', tone: 'primary' },
        { intersection: 'bottom', sector: ((b.sector + 2) % 4) as Sector, label: 'C', tone: 'neutral', arcStyle: 'double' },
      ];
    }
    case 'U3-P2-A': {
      const [a, b] = alt(0);
      return [{ ...a, label: 'A', tone: 'secondary' }, { ...b, label: 'B', tone: 'secondary' }];
    }
    case 'U3-P2-B': {
      const [a, b] = corr(0);
      return [
        { ...a, label: 'A', tone: 'primary' },
        { ...b, label: 'B', tone: 'primary' },
        { intersection: 'bottom', sector: ((b.sector + 2) % 4) as Sector, label: 'C', tone: 'neutral', arcStyle: 'double' },
      ];
    }
    case 'U3-P2-C': {
      const [a, b] = alt(1);
      return [
        { ...a, label: 'A', tone: 'secondary' },
        { ...b, label: 'B', tone: 'secondary' },
        { intersection: 'bottom', sector: ((b.sector + 2) % 4) as Sector, label: 'C', tone: 'neutral', arcStyle: 'double' },
      ];
    }
    case 'U3-P2-D': {
      const [a, b] = corr(0);
      return [{ ...a, label: 'A', tone: 'primary' }, { ...b, label: 'B', tone: 'primary' }];
    }
    case 'U3-P3-B': {
      const [a, b] = alt(0);
      return [
        { ...a, label: 'A', tone: 'secondary' },
        { ...b, label: 'B', tone: 'secondary' },
        { intersection: 'bottom', sector: ((b.sector + 1) % 4) as Sector, label: 'C', tone: 'neutral', arcStyle: 'double' },
      ];
    }
    case 'U3-P3-C': {
      // ∠E = 35° is drawn in an acute (65°) sector of s, well away from ∠A, ∠B, ∠D on r.
      const [a, b] = corr(1);
      return [
        { ...a, label: 'A', tone: 'primary' },
        { ...b, label: 'B', tone: 'primary' },
        { intersection: 'bottom', sector: ((b.sector + 2) % 4) as Sector, label: 'D', tone: 'neutral', arcStyle: 'double' },
        { intersection: 'bottom-secondary', sector: 0, label: 'E', value: '35°', tone: 'secondary' },
      ];
    }
    default:
      return [];
  }
}

function ProofDiagram({ q }: { q: Unit3Question }) {
  const labels = q.diagram.lineLabels;
  const pair: [string, string] = [labels[0] ?? 'p', labels[1] ?? 'q'];
  const hasSecondTransversal = q.diagram.secondaryTransversalDeg != null || labels.length > 3;
  const secondAngle = q.diagram.secondaryTransversalDeg ?? (hasSecondTransversal ? (q.diagram.transversalDeg ?? 62) + 58 : undefined);
  return (
    <ParallelLinesDiagram
      lineLabels={pair}
      transversalLabel={labels[2] ?? 't'}
      secondaryTransversalLabel={labels[3] ?? 's'}
      orientationDeg={q.diagram.orientationDeg}
      transversalDeg={q.diagram.transversalDeg ?? 62}
      {...(secondAngle == null ? {} : { secondaryTransversalDeg: secondAngle })}
      showParallelMarks={q.diagram.parallelGivens.length > 0}
      angleMarks={proofMarks(q)}
      ariaLabel="שרטוט גאומטרי להוכחה"
    />
  );
}

const isBlank = (text: string | undefined) => text === undefined || CLOZE_BLANK.test(text);

/** A proof cell: its text, or an empty cell to write in when the line is missing. */
function ProofCell({ text }: { text: string | undefined }) {
  if (isBlank(text)) return <td className="write-cell"><span className="sr-only">מקום לכתיבה</span></td>;
  return <td><MathText text={text ?? ''} /></td>;
}

/**
 * טענה | נימוק table. With `orderColumn`, a first 'סדר' column holds an empty cell per row, where the
 * student writes the position of that row in the proof.
 */
function ProofTable({ lines, orderColumn = false }: { lines: NonNullable<Unit3Question['proofLines']>; orderColumn?: boolean }) {
  return (
    <table className={`data-table proof-table${orderColumn ? ' proof-table--order' : ''}`}>
      <colgroup>
        {orderColumn && <col className="col-order" />}
        <col className="col-claim" />
        <col className="col-reason" />
      </colgroup>
      <thead>
        <tr>
          {orderColumn && <th>{PROOF_FORM_HEADINGS.order}</th>}
          <th>{PROOF_FORM_HEADINGS.claim}</th>
          <th>{PROOF_FORM_HEADINGS.reason}</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line, index) => (
          <tr key={index}>
            {orderColumn && <td className="write-cell write-cell--order"><span className="sr-only">מקום לכתיבה</span></td>}
            <ProofCell text={line.claim} />
            <ProofCell text={line.reason} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ProofQuestion({ q }: { q: Unit3Question }) {
  const format = taskFormatById(q.id);
  // Claim → reason matching: the reasons form a bank (no bubbles); every claim gets a reason slot on its line.
  const matching = format === 'match-claim-reason';
  const claims = q.subparts ?? [];
  return (
    <QuestionBlock
      taskId={q.id}
      compact
      diagram={<ProofDiagram q={q} />}
      {...(matching
        ? { items: claims.map(claim => ({ content: <><MathText text={claim} /><LineSlot label="נימוק:" /></>, inline: true })) }
        : { subparts: claims.map(text => <MathText text={text} />) })}
    >
      <MathText text={q.stem} />
      {q.choices && (matching ? <WordBank items={q.choices} layout="list" /> : <ChoiceGrid options={q.choices} />)}
      {q.proofLines && <ProofTable lines={q.proofLines} orderColumn={format === 'order-proof'} />}
    </QuestionBlock>
  );
}

function Unit3Page({ page }: { page: number }) {
  const questions = unit3Questions.filter(q => q.page === page);
  return (
    <A4Page unitNumber={3} unitTitle="תרגילי הוכחה" pageNumber={page}>
      {questions.map(q => <ProofQuestion key={q.id} q={q} />)}
    </A4Page>
  );
}

export function Unit3Pages() {
  return <>{[1, 2, 3].map(page => <Unit3Page page={page} key={page} />)}</>;
}
