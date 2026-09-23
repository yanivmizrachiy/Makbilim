import { A4Page } from '../components/A4Page';
import { MathText } from '../components/MathText';
import { QuestionBlock } from '../components/QuestionBlock';
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
      const [ca, cb] = corr(0);
      const [aa, ab] = alt(0);
      return [
        { ...ca, label: 'A', tone: 'primary' }, { ...cb, label: 'B', tone: 'primary' },
        { ...aa, label: 'C', tone: 'secondary' }, { ...ab, label: 'D', tone: 'secondary' },
        { intersection: 'top', sector: 1, label: 'E', tone: 'neutral', arcStyle: 'double' },
        { intersection: 'top', sector: 3, label: 'F', tone: 'neutral', arcStyle: 'double' },
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
      const [a, b] = corr(1);
      return [
        { ...a, label: 'A', tone: 'primary' },
        { ...b, label: 'B', tone: 'primary' },
        { intersection: 'bottom', sector: ((b.sector + 2) % 4) as Sector, label: 'D', tone: 'neutral', arcStyle: 'double' },
        { intersection: 'top-secondary', sector: 0, label: 'E', value: '35°', tone: 'secondary' },
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

function ProofTable({ lines }: { lines: NonNullable<Unit3Question['proofLines']> }) {
  return (
    <table className="data-table proof-table">
      <thead><tr><th>טענה</th><th>נימוק</th></tr></thead>
      <tbody>
        {lines.map((line, index) => (
          <tr key={index}>
            <td><MathText text={line.claim} /></td>
            <td>{line.reason ? <MathText text={line.reason} /> : <span className="table-write-line" />}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ProofQuestion({ q }: { q: Unit3Question }) {
  const isFullProof = q.page === 3;
  return (
    <QuestionBlock
      compact
      diagram={<ProofDiagram q={q} />}
      subparts={(q.subparts ?? []).map(text => <MathText text={text} />)}
      answerLines={isFullProof ? 3 : (q.proofLines || q.choices ? 1 : 2)}
    >
      <MathText text={q.stem} />
      {q.choices && (
        <div className="choice-grid">
          {q.choices.map(choice => <div className="choice" key={choice}><MathText text={choice} /></div>)}
        </div>
      )}
      {q.proofLines && <ProofTable lines={q.proofLines} />}
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
