import { A4Page } from '../components/A4Page';
import { ConclusionArrow } from '../components/ConclusionArrow';
import { MathText } from '../components/MathText';
import { QuestionBlock } from '../components/QuestionBlock';
import { ChoiceGrid, LineSlot, WordBank } from '../components/ResponseParts';
import { PROOF_FORM_HEADINGS } from '../content/answer-areas';
import { CLOZE_BLANK } from '../content/cloze';
import { taskFormatById } from '../content/task-kinds';
import { ParallelLinesDiagram, type AngleMark } from '../geometry/ParallelLinesDiagram';
import {
  adjacentSector,
  alternatePair,
  correspondingPair,
  sectorOfSize,
  verticalSector,
  type IntersectionName,
  type Sector,
} from '../geometry/relations';
import { unit3Questions, type Unit3Question } from '../content/questions-unit3';

/**
 * Angle marks for the unit-3 proof diagrams.
 *
 * In a proof the letters only NAME angles; which relation holds between them is what the student
 * has to argue. So every lettered angle has the same role ('marked') and therefore the same look:
 * neither colour nor arc form tells a corresponding pair from an alternate or a vertical one, and
 * a datum that is not needed (∠E in U3-P3-C) looks like every other angle.
 */
function proofMarks(q: Unit3Question): AngleMark[] {
  const o = q.diagram.orientationDeg;
  const t = q.diagram.transversalDeg ?? 62;
  const st = q.diagram.secondaryTransversalDeg;
  const mark = (ref: { intersection: AngleMark['intersection']; sector: Sector }, label: string): AngleMark =>
    ({ ...ref, label, role: 'marked' });
  const corr = (seed: Sector, from: IntersectionName = 'top') => correspondingPair(seed, from);
  const alt = (seed: number, from: IntersectionName = 'top') => alternatePair(o, t, seed, from);

  switch (q.id) {
    case 'U3-P1-A': {
      const [a, b] = corr(0);
      return [mark(a, 'A'), mark(b, 'B')];
    }
    case 'U3-P1-B': {
      const [c, d] = corr(1, 'bottom');
      return [mark(c, 'C'), mark(d, 'D')];
    }
    case 'U3-P1-C': {
      // Corresponding ∠A/∠B and alternate ∠C/∠D on s (four different angles), and the vertical
      // pair ∠E/∠F at the lower crossing of the second transversal t.
      const [c, d] = alt(0);
      const free = ([0, 1, 2, 3] as const).find(sector => sector !== c.sector && sector !== d.sector);
      if (free === undefined) throw new Error('U3-P1-C: no corresponding pair clear of the alternate pair');
      const [a, b] = corr(free);
      return [
        mark(a, 'A'), mark(b, 'B'),
        mark(c, 'C'), mark(d, 'D'),
        mark({ intersection: 'bottom-secondary', sector: 0 }, 'E'),
        mark({ intersection: 'bottom-secondary', sector: verticalSector(0) }, 'F'),
      ];
    }
    case 'U3-P1-D':
    case 'U3-P3-A': {
      // ∠A and ∠B corresponding, ∠C vertical to ∠B.
      const [a, b] = corr(q.id === 'U3-P3-A' ? 2 : 0);
      return [mark(a, 'A'), mark(b, 'B'), mark({ intersection: b.intersection, sector: verticalSector(b.sector) }, 'C')];
    }
    case 'U3-P3-D': {
      // ∠A and ∠B corresponding, ∠C vertical to ∠B. ∠A is an interior angle, so ∠A and ∠C are
      // alternate-interior angles — the relation proof ב names without the parallel condition.
      const [interior] = alt(0);
      const [a, b] = corr(interior.sector);
      return [mark(a, 'A'), mark(b, 'B'), mark({ intersection: b.intersection, sector: verticalSector(b.sector) }, 'C')];
    }
    case 'U3-P2-A': {
      const [a, b] = alt(0, 'bottom');
      return [mark(a, 'A'), mark(b, 'B')];
    }
    case 'U3-P2-B': {
      // ∠B and ∠C share the crossing away from the parallel marks; ∠A is alone at the other one.
      const [a, b] = corr(3, 'bottom');
      return [mark(a, 'A'), mark(b, 'B'), mark({ intersection: b.intersection, sector: verticalSector(b.sector) }, 'C')];
    }
    case 'U3-P2-C': {
      // ∠A and ∠B alternate, ∠C vertical to ∠B.
      const [a, b] = alt(1);
      return [mark(a, 'A'), mark(b, 'B'), mark({ intersection: b.intersection, sector: verticalSector(b.sector) }, 'C')];
    }
    case 'U3-P2-D': {
      const [a, b] = corr(1, 'bottom');
      return [mark(a, 'A'), mark(b, 'B')];
    }
    case 'U3-P3-B': {
      // ∠A and ∠B alternate, ∠C adjacent to ∠B.
      const [a, b] = alt(0);
      return [mark(a, 'A'), mark(b, 'B'), mark({ intersection: b.intersection, sector: adjacentSector(b.sector) }, 'C')];
    }
    case 'U3-P3-C': {
      // ∠A/∠B corresponding and ∠D vertical to ∠B on r; ∠E = 35° on s, drawn in an acute sector
      // (SPEC 10.3), well away from ∠A, ∠B, ∠D.
      if (st == null) throw new Error('U3-P3-C needs a second transversal');
      const [a, b] = corr(1);
      return [
        mark(a, 'A'),
        mark(b, 'B'),
        mark({ intersection: b.intersection, sector: verticalSector(b.sector) }, 'D'),
        { ...mark({ intersection: 'top-secondary', sector: sectorOfSize(o, st, 'acute') }, 'E'), value: '35°' },
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
function ProofCell({ text, arrow = false }: { text: string | undefined; arrow?: boolean }) {
  if (isBlank(text)) {
    return (
      <td className="write-cell">
        {arrow && <span className="proof-step-arrow"><ConclusionArrow /></span>}
        <span className="sr-only">מקום לכתיבה</span>
      </td>
    );
  }
  return (
    <td>
      {arrow && <span className="proof-step-arrow"><ConclusionArrow /></span>}
      <MathText text={text ?? ''} />
    </td>
  );
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
            {/* A conclusion arrow ⇓ leads each claim after the first — the proof flows step by step
               (SPEC 11.14). Not on an order-the-proof table, whose rows are deliberately scrambled. */}
            <ProofCell text={line.claim} arrow={!orderColumn && index > 0} />
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
    <A4Page pageId={`U3-P${page}`}>
      {questions.map(q => <ProofQuestion key={q.id} q={q} />)}
    </A4Page>
  );
}

export function Unit3Pages() {
  return <>{[1, 2, 3].map(page => <Unit3Page page={page} key={page} />)}</>;
}
