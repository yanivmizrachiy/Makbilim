import { Fragment } from 'react';
import { A4Page } from '../components/A4Page';
import { ClozeText } from '../components/ClozeText';
import { MathText } from '../components/MathText';
import { CLOZE_BLANK } from '../content/cloze';
import { QuestionBlock } from '../components/QuestionBlock';
import { ChoiceGrid, ItemRows, VerdictOptions } from '../components/ResponseParts';
import { DeductionChain } from '../components/DeductionChain';
import { answerSpecById } from '../content/answer-areas';
import { ParallelLinesDiagram, type AngleMark } from '../geometry/ParallelLinesDiagram';
import { ThreeLinesDiagram } from '../geometry/ThreeLinesDiagram';
import { alternatePairOfSize, correspondingPair, sectorOfSize } from '../geometry/relations';
import { unit4Questions, type Unit4Question } from '../content/questions-unit4';

/**
 * Angle marks for the unit-4 converse diagrams. Both angles of each pair are GIVEN (their sizes or
 * expressions); what is asked is whether the lines are parallel. Marks declare their role, never a
 * colour, so the style does not say which converse theorem applies. Sectors are chosen by the size
 * of the angle they show (SPEC 10.3).
 */
function marks(q: Unit4Question): AngleMark[] {
  if (!q.diagram) return [];
  const o = q.diagram.orientationDeg;
  const t = q.diagram.transversalDeg ?? 62;
  switch (q.id) {
    case 'U4-P1-D': {
      const [a, b] = correspondingPair(sectorOfSize(o, t, 'acute', 1), 'top');
      return [{ ...a, label: 'A', value: '67°', role: 'given' }, { ...b, label: 'B', value: '67°', role: 'given' }];
    }
    case 'U4-P2-A': {
      // ∠C = ∠D = 112°: the obtuse alternate-interior pair.
      const [c, d] = alternatePairOfSize(o, t, 'obtuse', 'bottom');
      return [{ ...c, label: 'C', value: '112°', role: 'given' }, { ...d, label: 'D', value: '112°', role: 'given' }];
    }
    case 'U4-P2-C': {
      // x = 20 gives 74°: an acute corresponding pair.
      const [a, b] = correspondingPair(sectorOfSize(o, t, 'acute'), 'top');
      return [{ ...a, value: '3x + 14°', role: 'given' }, { ...b, value: '5x − 26°', role: 'given' }];
    }
    default:
      return [];
  }
}

function ConverseDiagram({ q }: { q: Unit4Question }) {
  if (!q.diagram) return null;
  if (q.id === 'U4-P2-D') {
    return (
      <ThreeLinesDiagram
        lineLabels={['p', 'q', 'r']}
        transversalLabel="t"
        orientationDeg={q.diagram.orientationDeg}
        transversalDeg={q.diagram.transversalDeg ?? 57}
        parallelPair={[0, 1]}
        // The same (obtuse, 'left') position at all three crossings: ∠A/∠B and ∠B/∠C are
        // corresponding pairs, and the wide sector leaves room for each badge inside its own
        // angle (below r the acute 'right' sector is too tight, which pushed ∠C across r).
        // The three letters are proof names, so all three share one (default) style: ∠C, which
        // sits on the line whose parallelism is to be PROVED, must not look different.
        angleMarks={[
          { line: 0, label: 'A', side: 'left' },
          { line: 1, label: 'B', side: 'left' },
          { line: 2, label: 'C', side: 'left' },
        ]}
        ariaLabel="שלושה ישרים p, q, r וישר חותך; p ו־q מסומנים כמקבילים"
      />
    );
  }

  const labels = q.diagram.lineLabels;
  return (
    <ParallelLinesDiagram
      lineLabels={[labels[0] ?? 'p', labels[1] ?? 'q']}
      transversalLabel={labels[2] ?? 't'}
      orientationDeg={q.diagram.orientationDeg}
      transversalDeg={q.diagram.transversalDeg ?? 62}
      showParallelMarks={q.diagram.parallelGiven}
      angleMarks={marks(q)}
      ariaLabel="שני ישרים וישר חותך לצורך בדיקת המשפט ההפוך"
    />
  );
}

// Converse theorems read "אם …, אז …": each completion line breaks before "אז" so the
// premise and the conclusion sit on their own rows (and no single word is orphaned).
const CONCLUSION_BREAK = /\s+(?=אז\s)/;

const isTheoremCompletion = (q: Unit4Question) =>
  (q.subparts ?? []).length > 0 && (q.subparts ?? []).every(line => CLOZE_BLANK.test(line));

function ClozeLine({ line }: { line: string }) {
  return (
    <>
      {line.split(CONCLUSION_BREAK).map((clause, index) => (
        <Fragment key={index}>
          {index > 0 && <br />}
          <ClozeText text={clause} />
        </Fragment>
      ))}
    </>
  );
}

// The student writes directly in the blank of each line, so the block has no separate work rules.
function TheoremCompletion({ q }: { q: Unit4Question }) {
  return (
    <QuestionBlock taskId={q.id} subparts={(q.subparts ?? []).map(line => <ClozeLine line={line} />)}>
      <MathText text={q.stem} />
    </QuestionBlock>
  );
}

// One verdict per statement (○ משפט ישיר ○ משפט הפוך, or ○ נכון ○ לא נכון), set beside the statement
// it answers; where the task asks for a reason, its 'נימוק:' row(s) sit under the statement.
function PerStatementVerdict({ q }: { q: Unit4Question }) {
  const rows = answerSpecById(q.id).itemRows ?? 0;
  return (
    <QuestionBlock
      taskId={q.id}
      items={(q.subparts ?? []).map(line => ({
        content: <MathText text={line} />,
        aside: <VerdictOptions options={q.verdictOptions ?? []} />,
        ...(rows > 0 ? { after: <ItemRows label="נימוק:" rows={rows} /> } : {}),
      }))}
    >
      <MathText text={q.stem} />
    </QuestionBlock>
  );
}

function ConverseQuestion({ q }: { q: Unit4Question }) {
  if (isTheoremCompletion(q)) return <TheoremCompletion q={q} />;
  if (q.verdictOptions) return <PerStatementVerdict q={q} />;
  return (
    <QuestionBlock
      taskId={q.id}
      diagram={q.diagram ? <ConverseDiagram q={q} /> : undefined}
      subparts={(q.subparts ?? []).map(text => <MathText text={text} />)}
      response={q.deduction ? <DeductionChain deduction={q.deduction} /> : undefined}
    >
      <MathText text={q.stem} />
      {q.choices && <ChoiceGrid options={q.choices} />}
    </QuestionBlock>
  );
}

function Unit4Page({ page }: { page: number }) {
  const questions = unit4Questions.filter(q => q.page === page);
  return (
    <A4Page pageId={`U4-P${page}`}>
      {questions.map(q => <ConverseQuestion key={q.id} q={q} />)}
    </A4Page>
  );
}

export function Unit4Pages() {
  return <>{[1, 2, 3].map(page => <Unit4Page page={page} key={page} />)}</>;
}
