import { type ReactNode } from 'react';
import { choiceColumns } from '../content/answer-areas';
import { MathText } from './MathText';

/**
 * Response primitives shared by every page, so an affordance looks and behaves the same wherever it
 * appears. Styling: src/styles/print.css (answer system), tokens: src/styles/tokens.css.
 */

/**
 * One answer option: a drawn answer bubble (CSS, distinct from the ● question marker) and the
 * option's content in ONE inline container, so text runs and math islands flow as one line in
 * reading order (tests/unit/answer-areas.test.ts: every .choice has exactly one content element).
 */
export function Choice({ children }: { children: ReactNode }) {
  return <div className="choice"><span className="choice-text">{children}</span></div>;
}

/** Answer options in one or two columns, chosen from the options' length (answer-areas.ts). */
export function ChoiceGrid({ options, label = 'אפשרויות תשובה' }: { options: readonly string[]; label?: string }) {
  return (
    <div className="choice-grid" data-cols={choiceColumns(options)} role="group" aria-label={label}>
      {options.map(option => <Choice key={option}><MathText text={option} /></Choice>)}
    </div>
  );
}

/**
 * A bank of words or reasons to write from — NOT a choice: no answer bubbles. `layout="inline"`
 * sets short words on one line; `layout="list"` sets whole sentences one per line.
 */
export function WordBank({ items, layout = 'inline' }: { items: readonly string[]; layout?: 'inline' | 'list' }) {
  return (
    <div className="word-bank" data-layout={layout}>
      {items.map(item => <span className="word-bank-item" key={item}><MathText text={item} /></span>)}
    </div>
  );
}

/** Verdict options set beside (or under) one statement, e.g. ○ משפט ישיר ○ משפט הפוך. */
export function VerdictOptions({ options }: { options: readonly string[] }) {
  return (
    <div className="verdict-options" role="group" aria-label="קביעה">
      {options.map(option => <Choice key={option}>{option}</Choice>)}
    </div>
  );
}

/**
 * A solid write-in slot that runs to the end of the line (after a sub-item or a claim), with an
 * optional label ('נימוק:'). Same primitive as the in-sentence cloze blank, stretched.
 */
export function LineSlot({ label }: { label?: string | undefined }) {
  return (
    <span className="line-slot">
      {label && <span className="line-slot-label">{label}</span>}
      <span className="cloze-blank cloze-blank--fill" aria-hidden="true" />
      <span className="sr-only">מקום לכתיבה</span>
    </span>
  );
}

/** Dotted writing rows under one sub-item, the first opened by a label (e.g. 'נימוק:'). This is
 * prose reasoning, so it is ruled, not squared (SPEC 11.11א: squares are for computation only). */
export function ItemRows({ label, rows }: { label: string; rows: number }) {
  return (
    <div className="answer-lines answer-lines--item" data-answer-mode="reason">
      <span className="rule rule--lane justification-lane"><span className="justification-label">{label}</span></span>
      {Array.from({ length: Math.max(0, rows - 1) }, (_, index) => <span className="rule" key={index} aria-hidden="true" />)}
    </div>
  );
}
