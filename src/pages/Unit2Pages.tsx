import { A4Page } from '../components/A4Page';
import { MathText } from '../components/MathText';
import { QuestionBlock } from '../components/QuestionBlock';
import { ParallelLinesDiagram, type AngleMark } from '../geometry/ParallelLinesDiagram';
import {
  adjacentSector,
  alternatePairOfSize,
  correspondingPair,
  sectorOfSize,
  verticalSector,
  type AnglePair,
  type AngleSize,
  type IntersectionName,
  type PrimaryAngleRef,
  type Sector,
} from '../geometry/relations';
import { unit2Questions, type Unit2Question } from '../content/questions-unit2';

/**
 * Angle marks for the unit-2 diagrams.
 *
 * Every mark declares its ROLE, never a colour: the given angle (a known value), the target (the
 * angle to find), and auxiliary angles (intermediate steps). angle-roles.ts styles each role the
 * same way on every page, so colour never tells the student which relation (corresponding,
 * alternate, …) to use. An angle the stem names carries its name in the drawing (the value stays
 * in the stem); a value is drawn only for an angle the stem refers to without naming it.
 *
 * Sectors are chosen by the SIZE of the angle they show (SPEC 10.3), so the drawing stays
 * acute/obtuse-faithful whatever the diagram parameters in questions-unit2.ts are. The first
 * angle of each pair is the given one; `from` puts it on the top or the bottom line, and the
 * booklet alternates between the two on purpose (SPEC 10.2).
 */
function primaryMarks(q: Unit2Question): AngleMark[] {
  const o = q.diagram.orientationDeg;
  const t = q.diagram.transversalDeg ?? 62;
  const st = q.diagram.secondaryTransversalDeg;
  const second = () => {
    if (st == null) throw new Error(`${q.id}: marks on a second transversal need secondaryTransversalDeg`);
    return st;
  };
  /** A sector at the main transversal that draws an angle of this size. */
  const sized = (size: AngleSize, which: 0 | 1 = 0) => sectorOfSize(o, t, size, which);
  /** The same at the second transversal. */
  const sizedOnSecond = (size: AngleSize, which: 0 | 1 = 0) => sectorOfSize(o, second(), size, which);
  const corr = (sector: Sector, from: IntersectionName) => correspondingPair(sector, from);
  const alt = (size: AngleSize, from: IntersectionName) => alternatePairOfSize(o, t, size, from);
  const altOnSecond = (size: AngleSize, from: IntersectionName) => onSecond(alternatePairOfSize(o, second(), size, from));
  const at = (intersection: AngleMark['intersection'], sector: Sector) => ({ intersection, sector });

  switch (q.id) {
    case 'U2-P1-A': {
      const [a, b] = corr(sized('acute'), 'bottom');
      return [{ ...a, label: 'A', value: '68°', role: 'given' }, { ...b, label: 'B', role: 'target' }];
    }
    case 'U2-P1-B': {
      const [c, d] = alt('obtuse', 'top');
      return [{ ...c, label: 'C', value: '124°', role: 'given' }, { ...d, label: 'D', role: 'target' }];
    }
    case 'U2-P1-C': {
      // The stem says "the marked angle is 47°" without naming it, so the value is drawn.
      const [given, target] = corr(sized('acute', 1), 'bottom');
      return [{ ...given, value: '47°', role: 'given' }, { ...target, label: '?', role: 'target' }];
    }
    case 'U2-P1-D': {
      const [e, alpha] = alt('obtuse', 'bottom');
      return [{ ...e, label: 'E', value: '116°', role: 'given' }, { ...alpha, label: 'α', role: 'target' }];
    }
    case 'U2-P2-A': {
      // ∠A (bottom) → its corresponding angle (top) → β, vertical to it.
      const s = sized('acute', 1);
      return [
        { ...at('bottom', s), label: 'A', value: '63°', role: 'given' },
        { ...at('top', s), role: 'auxiliary' },
        { ...at('top', verticalSector(s)), label: 'β', role: 'target' },
      ];
    }
    case 'U2-P2-B': {
      // 137° (bottom) → the adjacent 43° angle → γ, alternate to it.
      const [step, gamma] = alt('acute', 'bottom');
      return [
        { ...at('bottom', adjacentSector(step.sector)), value: '137°', role: 'given' },
        { ...step, role: 'auxiliary' },
        { ...gamma, label: 'γ', role: 'target' },
      ];
    }
    case 'U2-P2-C': {
      // ∠F (bottom) → its alternate angle (top) → δ, adjacent to it.
      const [f, step] = alt('acute', 'bottom');
      return [
        { ...f, label: 'F', value: '72°', role: 'given' },
        { ...step, role: 'auxiliary' },
        { ...at(step.intersection, adjacentSector(step.sector, -1)), label: 'δ', role: 'target' },
      ];
    }
    case 'U2-P2-D': {
      // Two routes from ∠A to α: corresponding then vertical, or vertical then corresponding.
      const s = sized('acute');
      return [
        { ...at('top', s), label: 'A', value: '54°', role: 'given' },
        { ...at('bottom', s), role: 'auxiliary' },
        { ...at('top', verticalSector(s)), role: 'auxiliary' },
        { ...at('bottom', verticalSector(s)), label: 'α', role: 'target' },
      ];
    }
    case 'U2-P3-A': {
      // The 38° angle is interior, so its alternate angle is the alternate-interior one. The
      // letters do not follow the table's row order (corresponding, alternate, vertical,
      // adjacent): the student has to find each relation in the drawing.
      const [ref, alternate] = alt('acute', 'top');
      return [
        { ...ref, value: '38°', role: 'given' },
        { ...at('top', verticalSector(ref.sector)), label: 'א', role: 'target' },
        { ...at('bottom', ref.sector), label: 'ב', role: 'target' },
        { ...at('top', adjacentSector(ref.sector)), label: 'ג', role: 'target' },
        { ...alternate, label: 'ד', role: 'target' },
      ];
    }
    case 'U2-P3-B': {
      const s = sized('acute', 1);
      return [
        { ...at('top', s), label: 'A', value: '52°', role: 'given' },
        { ...at('bottom', s), label: 'D', role: 'target' },
        { ...at('bottom', adjacentSector(s)), label: 'F', role: 'target' },
      ];
    }
    case 'U2-P3-C': {
      // ∠C sits on the second transversal s: it is the datum that is not needed. It is drawn
      // exactly like ∠A, so its style does not give that away.
      const [a, beta] = corr(sized('acute'), 'bottom');
      return [
        { ...a, label: 'A', value: '62°', role: 'given' },
        { ...beta, label: 'β', role: 'target' },
        // On the line where the two transversals are farther apart (∠A is on the other line).
        { ...at('bottom-secondary', sizedOnSecond('acute')), label: 'C', value: '77°', role: 'given' },
      ];
    }
    case 'U2-P3-D': {
      // ∠A and α sit on the outer side of r; only β falls between the two transversals.
      const [a, alpha] = corr(sized('acute', 0), 'top');
      const [c, beta] = altOnSecond('acute', 'top');
      return [
        { ...a, label: 'A', value: '49°', role: 'given' },
        { ...alpha, label: 'α', role: 'target' },
        { ...c, label: 'C', value: '73°', role: 'given' },
        { ...beta, label: 'β', role: 'target' },
      ];
    }
    // Algebra: both angles are given as expressions; the unknown is x (or y), not an angle.
    case 'U2-P4-A': {
      const [first, second] = corr(sized('acute'), 'bottom');
      return [{ ...first, value: '(4x + 6)°', role: 'given' }, { ...second, value: '(2x + 38)°', role: 'given' }];
    }
    case 'U2-P4-B': {
      const [first, second] = alt('acute', 'top');
      return [{ ...first, value: '(3x + 17)°', role: 'given' }, { ...second, value: '(5x − 21)°', role: 'given' }];
    }
    case 'U2-P4-C': {
      // x = 17 gives 93°: drawn in an obtuse sector.
      const [first, second] = corr(sized('obtuse', 1), 'bottom');
      return [{ ...first, value: '(6x − 9)°', role: 'given' }, { ...second, value: '(3x + 42)°', role: 'given' }];
    }
    case 'U2-P4-D': {
      // x = 18 gives 71°: the acute alternate-interior pair.
      const [first, second] = alt('acute', 'bottom');
      return [{ ...first, value: '(2x + 35)°', role: 'given' }, { ...second, value: '(5x − 19)°', role: 'given' }];
    }
    case 'U2-P5-A': {
      // x = 16 gives 94°: drawn in an obtuse sector.
      const [first, second] = corr(sized('obtuse'), 'top');
      return [{ ...first, value: '(7x − 18)°', role: 'given' }, { ...second, value: '(3x + 46)°', role: 'given' }];
    }
    case 'U2-P5-B': {
      // x = 24 gives 111°: the obtuse alternate-interior pair.
      const [first, second] = alt('obtuse', 'bottom');
      return [{ ...first, value: '(4x + 15)°', role: 'given' }, { ...second, value: '(2x + 63)°', role: 'given' }];
    }
    case 'U2-P5-C': {
      // A corresponding pair (72°) on r and an obtuse alternate pair (94°) on s.
      // The long expressions face outwards (left of r, right of s); the short numbers sit in the
      // band between the two transversals.
      const [ex, n72] = corr(sized('acute', 0), 'bottom');
      const [ey, n94] = altOnSecond('obtuse', 'top');
      return [
        { ...ex, value: '(3x + 12)°', role: 'given' },
        { ...n72, value: '72°', role: 'given' },
        { ...ey, value: '(2y + 18)°', role: 'given' },
        { ...n94, value: '94°', role: 'given' },
      ];
    }
    case 'U2-P5-D': {
      // x = 25: (2x + 20)° = 70° in an acute sector, (3x + 35)° = 110° in the obtuse one beside it.
      const s = sized('acute', 1);
      return [
        { ...at('top', s), value: '(2x + 20)°', role: 'given' },
        { ...at('top', adjacentSector(s)), value: '(3x + 35)°', role: 'given' },
      ];
    }
    case 'U2-P6-A': {
      // The stem names the angle at the UPPER shelf, so the given stays on the top line.
      const [given, target] = corr(sized('acute'), 'top');
      return [{ ...given, value: '64°', role: 'given' }, { ...target, label: '?', role: 'target' }];
    }
    case 'U2-P6-B': {
      const [given, target] = alt('obtuse', 'top');
      return [{ ...given, value: '118°', role: 'given' }, { ...target, label: '?', role: 'target' }];
    }
    case 'U2-P6-C': {
      // ∠A = 128° (obtuse) → its corresponding angle → α = 52°, adjacent to it. ∠C = 75° on s is
      // not needed, and is drawn like any other given.
      const s = sized('obtuse');
      return [
        { ...at('top', s), label: 'A', value: '128°', role: 'given' },
        { ...at('bottom', s), role: 'auxiliary' },
        { ...at('bottom', adjacentSector(s)), label: 'α', role: 'target' },
        { ...at('top-secondary', sizedOnSecond('acute')), label: 'C', value: '75°', role: 'given' },
      ];
    }
    case 'U2-P6-D': {
      // α corresponds to ∠A = 41° on r; on s, ∠C = 68° → its corresponding angle → β = 112°.
      const [a, alpha] = corr(sized('acute', 1), 'bottom');
      const sc = sizedOnSecond('acute', 1);
      return [
        { ...a, label: 'A', value: '41°', role: 'given' },
        { ...alpha, label: 'α', role: 'target' },
        { ...at('bottom-secondary', sc), label: 'C', value: '68°', role: 'given' },
        { ...at('top-secondary', sc), role: 'auxiliary' },
        { ...at('top-secondary', adjacentSector(sc)), label: 'β', role: 'target' },
      ];
    }
    default:
      return [];
  }
}

/** A pair of angles at the crossings of the SECOND transversal. */
function onSecond(pair: AnglePair) {
  const shift = ({ intersection, sector }: PrimaryAngleRef) => ({ intersection: `${intersection}-secondary` as const, sector });
  return [shift(pair[0]), shift(pair[1])] as const;
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
            <td>{row.relation ? <MathText text={row.relation} /> : ''}</td>
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
