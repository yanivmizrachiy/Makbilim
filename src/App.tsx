import React from 'react';
import { A4Page } from './components/A4Page';
import { QuestionBlock } from './components/QuestionBlock';
import { ParallelLinesDiagram } from './geometry/ParallelLinesDiagram';
import { unit1Questions } from './content/questions-unit1';
import { Unit1Continuation } from './pages/Unit1Continuation';
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

function RelationChoices() {
  return (
    <div className="choice-grid" aria-label="אפשרויות תשובה">
      <div className="choice">מתאימות</div>
      <div className="choice">מתחלפות</div>
      <div className="choice">אינן שייכות לאחד משני הסוגים</div>
    </div>
  );
}

function Unit1Page1() {
  const a = byId('U1-P1-A');
  const b = byId('U1-P1-B');
  const c = byId('U1-P1-C');
  const d = byId('U1-P1-D');

  return (
    <A4Page unitNumber={1} unitTitle="מושגים בסיסיים" pageNumber={1}>
      <QuestionBlock diagram={<ParallelLinesDiagram lineLabels={['p', 'q']} transversalLabel="r" orientationDeg={0} transversalDeg={58} showParallelMarks={false} ariaLabel="שני ישרים וישר נוסף החותך את שניהם" />}>
        {a.stem}
      </QuestionBlock>

      <QuestionBlock diagram={<ParallelLinesDiagram lineLabels={['k', 'm']} transversalLabel="t" orientationDeg={4} transversalDeg={63} showParallelMarks={false} angleMarks={[{ intersection: 'top', sector: 0, tone: 'primary' }]} ariaLabel="זווית אחת מסומנת במפגש העליון" />}>
        {b.stem}
      </QuestionBlock>

      <QuestionBlock diagram={<ParallelLinesDiagram lineLabels={['a', 'b']} transversalLabel="s" orientationDeg={-7} transversalDeg={116} showParallelMarks={false} angleMarks={[{ intersection: 'top', sector: 1, tone: 'secondary' }]} ariaLabel="זווית אחת מסומנת; יש לזהות את הזווית המתחלפת לה" />}>
        {c.stem}
      </QuestionBlock>

      <QuestionBlock
        diagram={<ParallelLinesDiagram lineLabels={['u', 'v']} transversalLabel="w" orientationDeg={11} transversalDeg={71} showParallelMarks={false} angleMarks={[
          { intersection: 'top', sector: 0, tone: 'primary', arcStyle: 'single' },
          { intersection: 'bottom', sector: 0, tone: 'primary', arcStyle: 'single' },
          { intersection: 'top', sector: 1, tone: 'secondary', arcStyle: 'double' },
          { intersection: 'bottom', sector: 3, tone: 'secondary', arcStyle: 'double' },
          { intersection: 'top', sector: 2, tone: 'neutral', arcStyle: 'dashed' },
          { intersection: 'bottom', sector: 1, tone: 'neutral', arcStyle: 'dashed' },
        ]} ariaLabel="שלושה זוגות זוויות מסומנים בסוגי קשת שונים" />}
        subparts={(d.subparts ?? []).map(text => <>{text} ____________________</>)}
      >
        {d.stem}
        <RelationChoices />
      </QuestionBlock>
    </A4Page>
  );
}

export default function App() {
  return (
    <div className="preview-stack">
      <Unit1Page1 />
      <Unit1Continuation />
      <Unit2Pages />
      <Unit3Pages />
      <Unit4Pages />
      <Unit5Pages />
    </div>
  );
}
