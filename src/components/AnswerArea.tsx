import { type CSSProperties } from 'react';
import {
  answerSpecById,
  EQUATION_LABEL,
  EQUATION_LANES,
  finalSlotsFor,
  LANE_LABEL,
  PROOF_FORM_HEADINGS,
  TWO_WAYS_LABELS,
  type AnswerSpec,
} from '../content/answer-areas';
import { ClozeText } from './ClozeText';
import { MathText } from './MathText';

/**
 * Enough rows to fill the tallest possible work area (a whole A4 content area) at the smallest
 * allowed pitch. The ruled area is a column-wrapping flex box with overflow hidden: the rows that fit
 * its height stay in the first column, every row that does not fit wraps into a hidden column. So the
 * area always shows WHOLE rows at the constant pitch, however much height the page gives it.
 */
export const RULE_POOL = 38;

/**
 * Work areas that get squared paper (SPEC 11.11א / כ): multi-step calculation, algebra and the two
 * solution lanes. Short-answer reasons (justify / critique), completions and choices do NOT — they
 * keep prose writing rules or no area at all.
 */
export const GRID_MODES: ReadonlySet<string> = new Set(['work', 'algebra', 'value', 'two-ways']);

const minLinesStyle = (lines: number) => ({ '--answer-min-lines': lines }) as CSSProperties;

function Rules({ count, className = 'rule' }: { count: number; className?: string }) {
  return <>{Array.from({ length: count }, (_, index) => <span className={className} key={index} aria-hidden="true" />)}</>;
}

/** Only a task that writes an equation (algebra, or correcting a wrong equation) gets the equation cell. */
const EQUATION_MODES = new Set(['algebra', 'critique']);
const hasEquationCell = (spec: AnswerSpec) => EQUATION_MODES.has(spec.mode) && spec.lane !== undefined && EQUATION_LANES.has(spec.lane);

/**
 * Squared work paper (SPEC 11.5 / 11.11א), optionally opened by a labelled lane. On an equation
 * lane the row reads „המשוואה | המשפט המתאים”: the equation cell on the RIGHT (the start of the
 * RTL row), the theorem cell on the left. The labels sit on an opaque white background so they
 * never read over the grid squares.
 */
function RuledArea({ spec, minLines }: { spec: AnswerSpec; minLines: number }) {
  return (
    <div className="answer-lines" data-answer-mode={spec.mode} data-lane={spec.lane} data-grid="squares" style={minLinesStyle(minLines + (spec.lane ? 1 : 0))}>
      {spec.lane && (
        <span className="rule rule--lane justification-lane" {...(hasEquationCell(spec) ? { 'data-equation-lane': 'true' } : {})}>
          {hasEquationCell(spec) && <span className="justification-label justification-label--equation">{spec.equationLabel ?? EQUATION_LABEL}</span>}
          <span className="justification-label">{LANE_LABEL[spec.lane]}</span>
        </span>
      )}
      <Rules count={RULE_POOL} />
    </div>
  );
}

/** Two labelled work lanes side by side — words, never letters or numbers. */
function TwoWays({ spec }: { spec: AnswerSpec }) {
  return (
    <div className="answer-ways">
      {TWO_WAYS_LABELS.map(label => (
        <div className="answer-way" key={label}>
          <span className="answer-way-label">{label}</span>
          <div className="answer-lines" data-answer-mode={spec.mode} data-grid="squares" style={minLinesStyle(spec.minLines)}>
            <Rules count={RULE_POOL} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * A blank טענה | נימוק proof form whose rows are ruled at the writing pitch. The heading is the
 * area's first row, so it travels with the rows and the column divider never breaks.
 */
function ProofForm({ spec }: { spec: AnswerSpec }) {
  return (
    <div className="answer-lines answer-lines--proof" data-answer-mode={spec.mode} style={minLinesStyle(spec.minLines + 1)}>
      <span className="rule rule--proof-head">
        <span className="rule-claim">{PROOF_FORM_HEADINGS.claim}</span>
        <span className="rule-reason">{PROOF_FORM_HEADINGS.reason}</span>
      </span>
      {Array.from({ length: RULE_POOL }, (_, index) => (
        <span className="rule rule--proof" key={index} aria-hidden="true"><span className="rule-claim" /></span>
      ))}
    </div>
  );
}

/** Final-answer slots, e.g. '∠B = ____°' and 'x = ____', set as math with a wide typed blank. */
export function AnswerSlots({ taskId }: { taskId: string }) {
  const slots = finalSlotsFor(taskId);
  if (slots.length === 0) return null;
  return (
    <div className="answer-slots">
      {/* A measure slot ('∠B = ____°') is math; a word answer ('הנתון שאינו נחוץ: ____') is a cloze line. */}
      {slots.map(slot => <span className="answer-slot" key={slot}>{/[=°]/.test(slot) ? <MathText text={slot} /> : <ClozeText text={slot} />}</span>)}
    </div>
  );
}

/** The work area of a task, exactly as its answer spec (content/answer-areas.ts) describes it. */
export function AnswerArea({ taskId }: { taskId: string }) {
  const spec = answerSpecById(taskId);
  switch (spec.mode) {
    case 'value':
    case 'justify':
    case 'work':
    case 'algebra':
    case 'critique':
      return <RuledArea spec={spec} minLines={spec.minLines} />;
    case 'two-ways':
      return <TwoWays spec={spec} />;
    case 'proof':
      return <ProofForm spec={spec} />;
    case 'none':
    case 'items':
    case 'deduction':
      return null;
  }
}
