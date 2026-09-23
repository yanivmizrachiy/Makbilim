import { Fragment } from 'react';
import { A4Page } from '../components/A4Page';
import { ClozeText } from '../components/ClozeText';
import { MathText } from '../components/MathText';
import { CLOZE_BLANK } from '../content/cloze';
import { QuestionBlock } from '../components/QuestionBlock';
import { ParallelLinesDiagram, type AngleMark } from '../geometry/ParallelLinesDiagram';
import { ThreeLinesDiagram } from '../geometry/ThreeLinesDiagram';
import { alternatePair, correspondingPair } from '../geometry/relations';
import { unit4Questions, type Unit4Question } from '../content/questions-unit4';

function marks(q: Unit4Question): AngleMark[] {
  if (!q.diagram) return [];
  const o = q.diagram.orientationDeg;
  const t = q.diagram.transversalDeg ?? 62;
  switch (q.id) {
    case 'U4-P1-D': {
      const [a, b] = correspondingPair(0);
      return [{ ...a, label: 'A', value: '67°', tone: 'primary' }, { ...b, label: 'B', value: '67°', tone: 'primary' }];
    }
    case 'U4-P2-A': {
      // The obtuse interior alternate pair: 112° for lines at −13° and a transversal at 99°.
      const [a, b] = alternatePair(o, t, 1);
      return [{ ...a, label: 'C', value: '112°', tone: 'secondary' }, { ...b, label: 'D', value: '112°', tone: 'secondary' }];
    }
    case 'U4-P2-C': {
      const [a, b] = correspondingPair(1);
      return [{ ...a, value: '(3x + 14)°', tone: 'primary' }, { ...b, value: '(5x − 26)°', tone: 'primary' }];
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
        angleMarks={[
          { line: 0, label: 'A', side: 'left', tone: 'primary' },
          { line: 1, label: 'B', side: 'left', tone: 'primary' },
          { line: 2, label: 'C', side: 'left', tone: 'secondary' },
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

// The student writes directly in the blank of each line, so no separate answer lines.
function TheoremCompletion({ q }: { q: Unit4Question }) {
  return (
    <QuestionBlock taskId={q.id} compact subparts={(q.subparts ?? []).map(line => <ClozeLine line={line} />)}>
      <MathText text={q.stem} />
    </QuestionBlock>
  );
}

// One written verdict per statement (e.g. ישיר / הפוך): the statements carry no blank of their
// own, but the key holds one completion per line, so every line gets its own write-in slot.
const isPerLineVerdict = (q: Unit4Question) =>
  !isTheoremCompletion(q) && (q.subparts ?? []).length > 0 && q.expected.completions?.length === q.subparts?.length;

function VerdictLine({ line }: { line: string }) {
  return (
    <>
      <MathText text={line} />
      <span className="line-verdict">
        <span className="line-verdict-label">סוג המשפט:</span>
        <span className="cloze-blank" aria-hidden="true" />
        <span className="sr-only">מילה חסרה</span>
      </span>
    </>
  );
}

function PerLineVerdict({ q }: { q: Unit4Question }) {
  return (
    <QuestionBlock taskId={q.id} compact subparts={(q.subparts ?? []).map(line => <VerdictLine line={line} />)}>
      <MathText text={q.stem} />
    </QuestionBlock>
  );
}

function ConverseQuestion({ q }: { q: Unit4Question }) {
  if (isTheoremCompletion(q)) return <TheoremCompletion q={q} />;
  if (isPerLineVerdict(q)) return <PerLineVerdict q={q} />;
  const fullProof = q.id === 'U4-P2-D';
  return (
    <QuestionBlock
      taskId={q.id}
      compact
      diagram={q.diagram ? <ConverseDiagram q={q} /> : undefined}
      subparts={(q.subparts ?? []).map(text => <MathText text={text} />)}
      justificationLane={q.justificationLane ?? false}
      justificationLabel="המשפט המתאים:"
      answerLines={fullProof ? 4 : (q.choices ? 1 : 2)}
    >
      <MathText text={q.stem} />
      {q.choices && (
        <div className="choice-grid">
          {q.choices.map(choice => <div className="choice" key={choice}><MathText text={choice} /></div>)}
        </div>
      )}
    </QuestionBlock>
  );
}

function Unit4Page({ page }: { page: number }) {
  const questions = unit4Questions.filter(q => q.page === page);
  return (
    <A4Page unitNumber={4} unitTitle="משפטים הפוכים" pageNumber={page}>
      {questions.map(q => <ConverseQuestion key={q.id} q={q} />)}
    </A4Page>
  );
}

export function Unit4Pages() {
  return <>{[1, 2].map(page => <Unit4Page page={page} key={page} />)}</>;
}
