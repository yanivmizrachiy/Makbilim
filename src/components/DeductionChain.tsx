import { ClozeText } from './ClozeText';
import { ConclusionArrow } from './ConclusionArrow';
import { MathText } from './MathText';

export type Deduction = {
  /** The given facts, one per line, each tagged נתון. */
  givens: readonly string[];
  /** Intermediate conclusions, in order; a ↓ precedes each. */
  steps: readonly string[];
  /** The final conclusion; a ↓ precedes it. */
  conclusion: string;
  /** The justification the student completes — one blank per line. */
  reasonLines: readonly string[];
};

/**
 * A guided deduction (SPEC 3.2 / 11.14 / לד): given → ↓ → intermediate conclusion → ↓ → conclusion,
 * every line one LTR math island, joined by the shared ConclusionArrow, then the reason the student
 * completes one word per line. On the first converse applications the chain replaces free writing
 * rows: the student learns the SHAPE of the argument before writing one from scratch.
 */
export function DeductionChain({ deduction }: { deduction: Deduction }) {
  return (
    <div className="deduction-chain" role="group" aria-label="הסקה מודרכת">
      <div className="deduction-block deduction-block--given">
        {deduction.givens.map(given => (
          <div className="deduction-line" key={given}>
            <MathText text={given} />
            <span className="deduction-tag">נתון</span>
          </div>
        ))}
      </div>
      {deduction.steps.map(step => (
        <div className="deduction-block" key={step}>
          <ConclusionArrow />
          <div className="deduction-line"><MathText text={step} /></div>
        </div>
      ))}
      <div className="deduction-block deduction-block--conclusion">
        <ConclusionArrow />
        <div className="deduction-line"><MathText text={deduction.conclusion} /></div>
      </div>
      <div className="deduction-reason">
        <span className="justification-label">נימוק:</span>
        {deduction.reasonLines.map(line => (
          <div className="deduction-reason-line" key={line}><ClozeText text={line} /></div>
        ))}
      </div>
    </div>
  );
}
