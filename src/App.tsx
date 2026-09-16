import React from 'react';
import { A4Page } from './components/A4Page';
import { QuestionBlock } from './components/QuestionBlock';
import { ParallelLinesDiagram } from './geometry/ParallelLinesDiagram';
import './styles/print.css';

function RelationChoices() {
  return (
    <div className="choice-grid" aria-label="אפשרויות תשובה">
      <div className="choice">מתאימות</div>
      <div className="choice">מתחלפות</div>
      <div className="choice">אינן שייכות לאחד משני הסוגים</div>
    </div>
  );
}

export default function App() {
  return (
    <div className="preview-stack">
      <A4Page unitNumber={1} unitTitle="מושגים בסיסיים" pageNumber={1}>
        <QuestionBlock
          compact
          diagram={
            <ParallelLinesDiagram
              lineLabels={['p', 'q']}
              transversalLabel="r"
              orientationDeg={0}
              transversalDeg={58}
              showParallelMarks={false}
              ariaLabel="שני ישרים וישר נוסף החותך את שניהם"
            />
          }
        >
          בסרטוט שלפניכם שני ישרים וישר נוסף החותך את שניהם. סמנו את הישר החותך.
        </QuestionBlock>

        <QuestionBlock
          compact
          diagram={
            <ParallelLinesDiagram
              lineLabels={['k', 'm']}
              transversalLabel="t"
              orientationDeg={4}
              transversalDeg={63}
              showParallelMarks={false}
              angleMarks={[{ intersection: 'top', sector: 0, tone: 'primary' }]}
              ariaLabel="זווית אחת מסומנת במפגש העליון"
            />
          }
        >
          סמנו בשרטוט את הזווית המתאימה לזווית המסומנת.
        </QuestionBlock>

        <QuestionBlock
          compact
          diagram={
            <ParallelLinesDiagram
              lineLabels={['a', 'b']}
              transversalLabel="s"
              orientationDeg={-7}
              transversalDeg={116}
              showParallelMarks={false}
              angleMarks={[{ intersection: 'top', sector: 1, tone: 'secondary' }]}
              ariaLabel="זווית אחת מסומנת; יש לזהות את הזווית המתחלפת לה"
            />
          }
        >
          סמנו בשרטוט את הזווית המתחלפת לזווית המסומנת.
        </QuestionBlock>

        <QuestionBlock
          compact
          diagram={
            <ParallelLinesDiagram
              lineLabels={['u', 'v']}
              transversalLabel="w"
              orientationDeg={11}
              transversalDeg={71}
              showParallelMarks={false}
              angleMarks={[
                { intersection: 'top', sector: 0, label: 'A', tone: 'primary' },
                { intersection: 'bottom', sector: 0, label: 'B', tone: 'primary' },
                { intersection: 'top', sector: 2, label: 'C', tone: 'secondary' },
                { intersection: 'bottom', sector: 1, label: 'D', tone: 'secondary' },
              ]}
              ariaLabel="ארבע זוויות מסומנות באותיות לצורך מיון זוגות"
            />
          }
          subparts={[
            <>הזוג <span className="math" dir="ltr">∠A, ∠B</span>.</>,
            <>הזוג <span className="math" dir="ltr">∠C, ∠D</span>.</>,
          ]}
        >
          כתבו ליד כל זוג זוויות אם הן מתאימות, מתחלפות או אינן שייכות לאחד משני הסוגים.
          <RelationChoices />
        </QuestionBlock>

        <QuestionBlock
          compact
          diagram={
            <ParallelLinesDiagram
              lineLabels={['ℓ₁', 'ℓ₂']}
              transversalLabel="n"
              orientationDeg={-18}
              transversalDeg={49}
              showParallelMarks={false}
              angleMarks={[
                { intersection: 'top', sector: 3, label: 'α', tone: 'neutral' },
                { intersection: 'bottom', sector: 3, label: '1', tone: 'primary' },
                { intersection: 'bottom', sector: 0, label: '2', tone: 'secondary' },
                { intersection: 'bottom', sector: 2, label: '3', tone: 'neutral' },
              ]}
              ariaLabel="זווית אלפא ושלוש זוויות ממוספרות לבחירת הזווית המתאימה"
            />
          }
          answerLines={1}
        >
          התאימו לזווית <span className="math" dir="ltr">α</span> את הזווית המתאימה לה מבין הזוויות המסומנות בשרטוט.
        </QuestionBlock>
      </A4Page>
    </div>
  );
}
