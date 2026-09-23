import { A4Page } from '../components/A4Page';
import { MathText } from '../components/MathText';
import { QuestionBlock } from '../components/QuestionBlock';
import { ParallelLinesDiagram, type AngleMark } from '../geometry/ParallelLinesDiagram';
import { alternatePair, correspondingPair, type Sector } from '../geometry/relations';
import { unit2Questions, type Unit2Question } from '../content/questions-unit2';

function primaryMarks(q: Unit2Question): AngleMark[] {
  const o = q.diagram.orientationDeg;
  const t = q.diagram.transversalDeg ?? 62;
  const st = q.diagram.secondaryTransversalDeg;
  const corr = (seed: Sector = 0) => correspondingPair(seed);
  const alt = (seed = 0) => alternatePair(o, t, seed);
  const secAlt = (seed = 0) => {
    if (st == null) return null;
    const [a, b] = alternatePair(o, st, seed);
    return [
      { intersection: 'top-secondary' as const, sector: a.sector },
      { intersection: 'bottom-secondary' as const, sector: b.sector },
    ] as const;
  };

  switch (q.id) {
    case 'U2-P1-A': {
      const [a, b] = corr(0);
      return [{ ...a, value: '68°', tone: 'primary' }, { ...b, label: '?', tone: 'primary' }];
    }
    case 'U2-P1-B': {
      const [a, b] = alt(0);
      return [{ ...a, value: '124°', tone: 'secondary' }, { ...b, label: '?', tone: 'secondary' }];
    }
    case 'U2-P1-C': {
      const [a, b] = corr(1);
      return [{ ...a, value: '47°', tone: 'primary' }, { ...b, label: '?', tone: 'primary' }];
    }
    case 'U2-P1-D': {
      const [a, b] = alt(1);
      return [{ ...a, value: '116°', tone: 'secondary' }, { ...b, label: 'α', tone: 'secondary' }];
    }
    case 'U2-P2-A': {
      const [a, b] = corr(0);
      return [
        { ...a, value: '63°', tone: 'primary' },
        { ...b, tone: 'primary' },
        { intersection: 'bottom', sector: ((b.sector + 2) % 4) as Sector, label: 'β', tone: 'neutral', arcStyle: 'double' },
      ];
    }
    case 'U2-P2-B': {
      const [a, b] = alt(0);
      const adjacent = ((a.sector + 1) % 4) as Sector;
      return [
        { intersection: 'top', sector: adjacent, value: '137°', tone: 'primary' },
        { ...a, tone: 'neutral', arcStyle: 'double' },
        { ...b, label: 'γ', tone: 'secondary' },
      ];
    }
    case 'U2-P2-C': {
      const [a, b] = alt(1);
      return [
        { ...a, value: '72°', tone: 'secondary' },
        { ...b, tone: 'secondary' },
        { intersection: 'bottom', sector: ((b.sector + 1) % 4) as Sector, label: 'δ', tone: 'neutral', arcStyle: 'double' },
      ];
    }
    case 'U2-P2-D': {
      // Sector 1 is the 54° sector for lines at −14° and a transversal at 40°.
      const [a, b] = corr(1);
      return [
        { ...a, value: '54°', tone: 'primary' },
        { ...b, tone: 'primary' },
        { intersection: 'top', sector: ((a.sector + 2) % 4) as Sector, tone: 'neutral', arcStyle: 'double' },
        { intersection: 'bottom', sector: ((b.sector + 2) % 4) as Sector, label: 'α', tone: 'neutral', arcStyle: 'double' },
      ];
    }
    case 'U2-P3-A': {
      const [a, b] = corr(0);
      const [altTop, altBottom] = alt(0);
      return [
        { ...a, value: '38°', tone: 'primary' },
        { ...b, label: 'א', tone: 'primary' },
        { ...altBottom, label: 'ב', tone: 'secondary' },
        { intersection: 'top', sector: ((a.sector + 2) % 4) as Sector, label: 'ג', tone: 'neutral', arcStyle: 'double' },
        { intersection: 'top', sector: ((a.sector + 1) % 4) as Sector, label: 'ד', tone: 'neutral', arcStyle: 'dashed' },
        { ...altTop, tone: 'secondary' },
      ];
    }
    case 'U2-P3-B': {
      const [a, b] = corr(0);
      return [
        { ...a, label: 'A', value: '52°', tone: 'primary' },
        { ...b, label: 'D', tone: 'primary' },
        { intersection: 'bottom', sector: ((b.sector + 1) % 4) as Sector, label: 'F', tone: 'neutral', arcStyle: 'double' },
      ];
    }
    case 'U2-P3-C': {
      const [a, b] = corr(0);
      return [
        { ...a, label: 'A', value: '62°', tone: 'primary' },
        { ...b, label: 'β', tone: 'primary' },
        { intersection: 'top-secondary', sector: 1, label: 'C', value: '77°', tone: 'secondary' },
      ];
    }
    case 'U2-P3-D': {
      const [a, b] = corr(1);
      const secondary = secAlt(0);
      return [
        { ...a, label: 'A', value: '49°', tone: 'primary' },
        { ...b, label: 'α', tone: 'primary' },
        ...(secondary ? [
          { ...secondary[0], label: 'C', value: '73°', tone: 'secondary' as const },
          { ...secondary[1], label: 'β', tone: 'secondary' as const },
        ] : []),
      ];
    }
    case 'U2-P4-A': {
      const [a, b] = corr(0);
      return [{ ...a, value: '(4x + 6)°', tone: 'primary' }, { ...b, value: '(2x + 38)°', tone: 'primary' }];
    }
    case 'U2-P4-B': {
      const [a, b] = alt(0);
      return [{ ...a, value: '(3x + 17)°', tone: 'secondary' }, { ...b, value: '(5x − 21)°', tone: 'secondary' }];
    }
    case 'U2-P4-C': {
      // x = 17 gives 93°: sector 2 is the obtuse (100°) sector for lines at 71°, transversal at 171°.
      const [a, b] = corr(2);
      return [{ ...a, value: '(6x − 9)°', tone: 'primary' }, { ...b, value: '(3x + 42)°', tone: 'primary' }];
    }
    case 'U2-P4-D': {
      // x = 18 gives 71°: the acute interior alternate pair (71° for lines at 15°, transversal at 124°).
      const [a, b] = alt(1);
      return [{ ...a, value: '(2x + 35)°', tone: 'secondary' }, { ...b, value: '(5x − 19)°', tone: 'secondary' }];
    }
    case 'U2-P5-A': {
      const [a, b] = corr(2);
      return [{ ...a, value: '(7x − 18)°', tone: 'primary' }, { ...b, value: '(3x + 46)°', tone: 'primary' }];
    }
    case 'U2-P5-B': {
      const [a, b] = alt(0);
      return [{ ...a, value: '(4x + 15)°', tone: 'secondary' }, { ...b, value: '(2x + 63)°', tone: 'secondary' }];
    }
    case 'U2-P5-C': {
      // Corresponding pair in the 76° sectors of r (72°), alternate pair in the 94° sectors of s.
      // The long expressions sit at q, where the two transversals are far apart.
      const [a, b] = corr(1);
      const secondary = secAlt(1);
      return [
        { ...b, value: '(3x + 12)°', tone: 'primary' },
        { ...a, value: '72°', tone: 'primary' },
        ...(secondary ? [
          { ...secondary[1], value: '(2y + 18)°', tone: 'secondary' as const },
          { ...secondary[0], value: '94°', tone: 'secondary' as const },
        ] : []),
      ];
    }
    case 'U2-P5-D':
      // x = 25: (2x + 20)° = 70° sits in the 68° sector, (3x + 35)° = 110° in the 112° sector.
      return [
        { intersection: 'top', sector: 1, value: '(2x + 20)°', tone: 'primary' },
        { intersection: 'top', sector: 0, value: '(3x + 35)°', tone: 'secondary' },
      ];
    case 'U2-P6-A': {
      const [a, b] = corr(0);
      return [{ ...a, value: '64°', tone: 'primary' }, { ...b, label: '?', tone: 'primary' }];
    }
    case 'U2-P6-B': {
      // The obtuse interior alternate pair: 118° for rails at −12° and a transversal at 106°.
      const [a, b] = alt(1);
      return [{ ...a, value: '118°', tone: 'secondary' }, { ...b, label: '?', tone: 'secondary' }];
    }
    case 'U2-P6-C': {
      // ∠A = 128° in an obtuse (135°) sector of r, α = 52° in the adjacent acute (45°) one;
      // ∠C = 75° in a 75° sector of s.
      const [a, b] = corr(1);
      return [
        { ...a, label: 'A', value: '128°', tone: 'primary' },
        { ...b, tone: 'primary' },
        { intersection: 'bottom', sector: ((b.sector + 1) % 4) as Sector, label: 'α', tone: 'neutral', arcStyle: 'double' },
        { intersection: 'top-secondary', sector: 0, label: 'C', value: '75°', tone: 'secondary' },
      ];
    }
    case 'U2-P6-D': {
      // ∠A = 41° and α in 50° sectors of r; ∠C = 68° and its corresponding angle in 68° sectors
      // of s, β = 112° in the adjacent 112° sector.
      const [a, b] = corr(2);
      return [
        { ...a, label: 'A', value: '41°', tone: 'primary' },
        { ...b, label: 'α', tone: 'primary' },
        { intersection: 'top-secondary', sector: 0, label: 'C', value: '68°', tone: 'secondary' },
        { intersection: 'bottom-secondary', sector: 0, tone: 'secondary' },
        { intersection: 'bottom-secondary', sector: 1, label: 'β', tone: 'neutral', arcStyle: 'double' },
      ];
    }
    default:
      return [];
  }
}

function QuestionDiagram({ q }: { q: Unit2Question }) {
  const labels = q.diagram.lineLabels;
  const pair: [string, string] = [labels[0] ?? 'p', labels[1] ?? 'q'];
  return (
    <ParallelLinesDiagram
      lineLabels={pair}
      transversalLabel={labels[2] ?? 't'}
      secondaryTransversalLabel={labels[3] ?? 's'}
      orientationDeg={q.diagram.orientationDeg}
      transversalDeg={q.diagram.transversalDeg ?? 62}
      secondaryTransversalDeg={q.diagram.secondaryTransversalDeg}
      showParallelMarks={q.diagram.parallelGiven}
      angleMarks={primaryMarks(q)}
      ariaLabel="שרטוט גאומטרי המתאים לנתוני השאלה"
    />
  );
}

function TaskTable({ rows }: { rows: NonNullable<Unit2Question['tableRows']> }) {
  return (
    <table className="data-table">
      <thead><tr><th>זווית / קשר</th><th>סוג הקשר</th><th>גודל</th></tr></thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>
            <td><MathText text={row.label} /></td>
            <td>{row.relation ?? ''}</td>
            <td>{row.value ? <MathText text={row.value} /> : <span className="table-write-line" />}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CalculationQuestion({ q }: { q: Unit2Question }) {
  const outputCount = Object.keys(q.expected.values ?? {}).length;
  return (
    <QuestionBlock
      taskId={q.id}
      compact
      diagram={<QuestionDiagram q={q} />}
      justificationLane={q.justificationLane}
      justificationLabel="המשפט המתאים:"
      answerLines={q.choices || q.tableRows ? 0 : Math.max(1, Math.min(2, outputCount))}
    >
      <MathText text={q.stem} />
      {q.choices && (
        <div className="choice-grid">
          {q.choices.map(choice => <div className="choice" key={choice}><MathText text={choice} /></div>)}
        </div>
      )}
      {q.tableRows && <TaskTable rows={q.tableRows} />}
    </QuestionBlock>
  );
}

function Unit2Page({ page }: { page: number }) {
  const questions = unit2Questions.filter(q => q.page === page);
  return (
    <A4Page unitNumber={2} unitTitle="תרגילי חישוב" pageNumber={page}>
      {questions.map(q => <CalculationQuestion key={q.id} q={q} />)}
    </A4Page>
  );
}

export function Unit2Pages() {
  return <>{[1, 2, 3, 4, 5, 6].map(page => <Unit2Page page={page} key={page} />)}</>;
}
