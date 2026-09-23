import { A4Page } from './components/A4Page';
import { QuestionBlock } from './components/QuestionBlock';
import { LineSlot, WordBank } from './components/ResponseParts';
import { ParallelLinesDiagram } from './geometry/ParallelLinesDiagram';
import { unit1Questions } from './content/questions-unit1';
import { Unit1Continuation, Unit1Page5 } from './pages/Unit1Continuation';
import { Unit2Pages } from './pages/Unit2Pages';
import { Unit3Pages } from './pages/Unit3Pages';
import { Unit4Pages } from './pages/Unit4Pages';
import { Unit5Pages } from './pages/Unit5Pages';
import './styles/print.css';

const byId = (id: string) => {
  const question = unit1Questions.find(item => item.id === id);
  if (!question) throw new Error(`Missing unit 1 question: ${id}`);
  return question;
};

// The three classes the student writes beside each marked pair: a bank to write from, not a choice.
const PAIR_CLASSES = ['מתאימות', 'מתחלפות', 'אינן שייכות לאחד משני הסוגים'];

export function Unit1Page1() {
  const a = byId('U1-P1-A');
  const b = byId('U1-P1-B');
  const c = byId('U1-P1-C');
  const d = byId('U1-P1-D');

  return (
    <A4Page pageId="U1-P1">
      <QuestionBlock taskId={a.id} compact diagram={<ParallelLinesDiagram lineLabels={['p', 'q']} transversalLabel="r" orientationDeg={0} transversalDeg={50} showParallelMarks={false} ariaLabel="שני ישרים וישר נוסף החותך את שניהם" />}>
        {a.stem}
      </QuestionBlock>

      <QuestionBlock taskId={b.id} compact diagram={<ParallelLinesDiagram lineLabels={['k', 'm']} transversalLabel="t" orientationDeg={4} transversalDeg={142} showParallelMarks={false} angleMarks={[{ intersection: 'top', sector: 0, role: 'marked' }]} ariaLabel="זווית אחת מסומנת במפגש העליון" />}>
        {b.stem}
      </QuestionBlock>

      <QuestionBlock taskId={c.id} compact diagram={<ParallelLinesDiagram lineLabels={['a', 'b']} transversalLabel="s" orientationDeg={-7} transversalDeg={101} showParallelMarks={false} angleMarks={[{ intersection: 'top', sector: 0, role: 'marked' }]} ariaLabel="זווית אחת מסומנת בין שני הישרים; יש לזהות את הזווית המתחלפת לה" />}>
        {c.stem}
      </QuestionBlock>

      <QuestionBlock
        taskId={d.id}
        compact
        diagram={<ParallelLinesDiagram lineLabels={['u', 'v']} transversalLabel="w" orientationDeg={11} transversalDeg={71} showParallelMarks={false} angleMarks={[
          // arc-form-whitelist:start U1-P1-D — the task text names each pair by its arc form
          // (one arc / two arcs / a dashed arc), so only the arc form is set here. All three pairs
          // share one colour: a colour per pair would hint at the relation the student classifies.
          { intersection: 'top', sector: 0, arcStyle: 'single' },
          { intersection: 'bottom', sector: 0, arcStyle: 'single' },
          { intersection: 'top', sector: 1, arcStyle: 'double' },
          { intersection: 'bottom', sector: 3, arcStyle: 'double' },
          { intersection: 'top', sector: 2, arcStyle: 'dashed' },
          { intersection: 'bottom', sector: 1, arcStyle: 'dashed' },
          // arc-form-whitelist:end
        ]} ariaLabel="שלושה זוגות זוויות מסומנים בסוגי קשת שונים" />}
        items={(d.subparts ?? []).map(text => ({ content: <>{text}<LineSlot /></>, inline: true }))}
      >
        {d.stem}
        <WordBank items={PAIR_CLASSES} />
      </QuestionBlock>
    </A4Page>
  );
}

export default function App() {
  return (
    <div className="preview-stack">
      <Unit5Pages />
      <Unit1Page5 />
      <Unit1Page1 />
      <Unit1Continuation />
      <Unit2Pages />
      <Unit3Pages />
      <Unit4Pages />
    </div>
  );
}
