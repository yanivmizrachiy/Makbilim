/**
 * Answer areas — what the page gives the student to answer each task with, decided in data.
 *
 * Every didactic `format` in question-plan.json has one AnswerSpec (FORMAT_ANSWER); a few tasks pin
 * their own (TASK_ANSWER_OVERRIDES). components/AnswerArea.tsx renders the spec — the pages never
 * hard-code writing lines. tests/unit/answer-areas.test.ts fails if a format is unmapped, or if a
 * stem that asks the student to justify, explain, prove or state gets less than two writing rows.
 *
 * Layout contract (src/styles/print.css, tokens in src/styles/tokens.css):
 *  - `grow` is the block's flex weight on its page: surplus page height goes to the blocks that
 *    write, in proportion to how much they write, and becomes additional WHOLE rules at the constant
 *    --rule-pitch (never half lines).
 *  - `minLines` is the minimum number of writing rows the block keeps even on the densest page.
 */
import plan from './question-plan.json';
import { unit2Questions } from './questions-unit2';
import { unit4Questions } from './questions-unit4';

/**
 * How the student answers:
 *  none      the diagram, the choices, the table or the in-sentence blanks ARE the answer surface
 *  items     one answer per sub-item, on its own line (a verdict, a word or a reason slot)
 *  value     a short calculation: final-value slot(s) and a few work rules
 *  justify   a decision with its reason: rules (optionally led by a 'נימוק:' lane)
 *  work      a multi-step calculation or an explanation
 *  two-ways  two labelled work lanes side by side ('דרך ראשונה' / 'דרך שנייה')
 *  algebra   'המשפט המתאים:' lane, equation work rules and the result slots
 *  critique  judge a claim, an equation or a proof, and correct it
 *  proof     a blank טענה | נימוק proof form, ruled at the writing pitch
 */
export type AnswerMode = 'none' | 'items' | 'value' | 'justify' | 'work' | 'two-ways' | 'algebra' | 'critique' | 'proof';

/** The lane that opens the work area: the theorem that justifies the equation, or a reason. */
export type AnswerLane = 'theorem' | 'reason';

export type AnswerSpec = {
  mode: AnswerMode;
  /** Minimum writing rows (per lane for two-ways; form rows for proof). The lane row is extra. */
  minLines: number;
  /** A labelled first work row. */
  lane?: AnswerLane;
  /** Final-answer slots (e.g. '∠B = ____°'), named by the unknowns the task asks for. */
  final?: boolean;
  /** Which unknowns get a final slot, when not all of the task's answer values are asked for. */
  finalKeys?: readonly string[];
  /** Writing rows under EACH sub-item (e.g. the 'נימוק:' rows of a true/false statement). */
  itemRows?: number;
};

/** Deterministic flex weight per mode: identification/completion 0 · value 1 · work/justify 2 · algebra/critique/proof 3. */
export const GROW_BY_MODE: Readonly<Record<AnswerMode, 0 | 1 | 2 | 3>> = {
  none: 0,
  items: 0,
  value: 1,
  justify: 2,
  work: 2,
  'two-ways': 2,
  algebra: 3,
  critique: 3,
  proof: 3,
};

export const LANE_LABEL: Readonly<Record<AnswerLane, string>> = {
  theorem: 'המשפט המתאים:',
  reason: 'נימוק:',
};

/** Labels of the two lanes of a 'two-ways' task — words, never letters or numbers (SPEC 4.2). */
export const TWO_WAYS_LABELS = ['דרך ראשונה', 'דרך שנייה'] as const;

/** Column headings of the blank proof form and of the order column. */
export const PROOF_FORM_HEADINGS = { claim: 'טענה', reason: 'נימוק', order: 'סדר' } as const;

export const FORMAT_ANSWER: Readonly<Record<string, AnswerSpec>> = {
  // Unit 1 — the diagram, the table, the choices or the blanks are the answer surface.
  'mark-on-diagram': { mode: 'none', minLines: 0 },
  classification: { mode: 'items', minLines: 0 },
  matching: { mode: 'none', minLines: 0 },
  'construction-and-explain': { mode: 'work', minLines: 2 },
  'sentence-completion': { mode: 'none', minLines: 0 },
  'true-false': { mode: 'items', minLines: 0, itemRows: 2 },
  'claim-comparison': { mode: 'critique', minLines: 3 },
  table: { mode: 'none', minLines: 0 },
  'multiple-choice': { mode: 'none', minLines: 0 },
  'error-correction': { mode: 'critique', minLines: 3 },

  // Unit 2 — calculations: final slots under the stem, then work rules.
  'numeric-direct': { mode: 'value', minLines: 2, final: true },
  'numeric-reason': { mode: 'justify', minLines: 1, lane: 'reason', final: true },
  'two-step-numeric': { mode: 'work', minLines: 3, final: true },
  'route-choice': { mode: 'two-ways', minLines: 3, final: true },
  'table-lookup': { mode: 'value', minLines: 2, final: true },
  'redundant-data': { mode: 'work', minLines: 3, final: true },
  'two-transversals': { mode: 'work', minLines: 3, final: true },
  'context-numeric': { mode: 'value', minLines: 2, final: true },
  'mixed-calculation': { mode: 'work', minLines: 3, final: true },
  'simple-algebra': { mode: 'algebra', minLines: 2, lane: 'theorem', final: true },
  'algebra-then-angle': { mode: 'algebra', minLines: 2, lane: 'theorem', final: true },
  'equation-choice': { mode: 'algebra', minLines: 2, lane: 'theorem', final: true },
  'two-expression-algebra': { mode: 'algebra', minLines: 2, lane: 'theorem', final: true },
  'two-variable-light': { mode: 'algebra', minLines: 2, lane: 'theorem', final: true },
  'error-analysis': { mode: 'critique', minLines: 2, lane: 'theorem', final: true },
  'mixed-algebra': { mode: 'algebra', minLines: 2, lane: 'theorem', final: true },

  // Unit 3 — reasons and proofs.
  'choose-reason': { mode: 'none', minLines: 0 },
  'fill-reason': { mode: 'none', minLines: 0 },
  'match-claim-reason': { mode: 'items', minLines: 0 },
  'determine-justify': { mode: 'justify', minLines: 3 },
  'proof-error': { mode: 'critique', minLines: 3 },
  'order-proof': { mode: 'none', minLines: 0 },
  'fill-proof-line': { mode: 'none', minLines: 0 },
  'sufficient-data': { mode: 'justify', minLines: 2 },
  'short-proof': { mode: 'proof', minLines: 4 },
  'proof-with-extra-data': { mode: 'proof', minLines: 4 },
  'proof-comparison': { mode: 'critique', minLines: 3 },

  // Unit 4 — converse theorems.
  'direct-vs-converse': { mode: 'items', minLines: 0 },
  'numeric-parallelism': { mode: 'justify', minLines: 2 },
  'algebra-for-parallelism': { mode: 'algebra', minLines: 3, lane: 'theorem', final: true },
  'short-parallelism-proof': { mode: 'proof', minLines: 5 },
};

/** Tasks whose format alone does not fix the answer area. */
export const TASK_ANSWER_OVERRIDES: Readonly<Record<string, AnswerSpec>> = {
  // 'חשבו את α + β' — α and β are steps on the way, the asked value is their sum.
  'U2-P6-D': { mode: 'algebra', minLines: 2, lane: 'theorem', final: true, finalKeys: ['α + β'] },
  // Five converse claims on a full page: one 'נימוק:' row under each verdict (five rows in all).
  'U4-P2-B': { mode: 'items', minLines: 0, itemRows: 1 },
  // Name the pair type, conclude k ∥ m and cite the full converse: three rows (the guided U4-P1-D keeps two).
  'U4-P2-A': { mode: 'justify', minLines: 3 },
};

const FORMAT_BY_TASK_ID: ReadonlyMap<string, string> = new Map(
  plan.units.flatMap(unit => unit.tasks.map(task => [task.id, task.format] as const)),
);

export function answerSpecFor(taskId: string, format: string): AnswerSpec {
  const spec = TASK_ANSWER_OVERRIDES[taskId] ?? FORMAT_ANSWER[format];
  if (!spec) throw new Error(`Task ${taskId}: format "${format}" has no answer spec — add it to FORMAT_ANSWER.`);
  return spec;
}

/** The answer spec of an original task (units 1–4), looked up by its id in question-plan.json. */
export function answerSpecById(taskId: string): AnswerSpec {
  const format = FORMAT_BY_TASK_ID.get(taskId);
  if (!format) throw new Error(`Unknown task id "${taskId}" — it is not in question-plan.json.`);
  return answerSpecFor(taskId, format);
}

export const growOf = (spec: AnswerSpec): 0 | 1 | 2 | 3 => GROW_BY_MODE[spec.mode];

/** Unknowns that are measured without a degree sign. */
const PURE_NUMBER = new Set(['x', 'y']);
/** The unknown named in words ('the angle'), labelled in the stem's own number (זווית / זוויות). */
const WORD_ANGLE = 'זווית';

/**
 * One final-answer slot as a MathText line with a typed blank: '∠B = ____°', 'x = ____',
 * 'גודל הזווית: ____°'. MathText keeps the blank inside the expression's single LTR island.
 */
export function finalSlotText(key: string, stem = ''): string {
  if (key === WORD_ANGLE) return `${stem.includes('הזוויות') ? 'גודל הזוויות' : 'גודל הזווית'}: ____°`;
  return PURE_NUMBER.has(key) ? `${key} = ____` : `${key} = ____°`;
}

const ANSWERED_QUESTIONS: ReadonlyMap<string, { stem: string; keys: readonly string[] }> = new Map(
  [...unit2Questions, ...unit4Questions].map(q => [q.id, { stem: q.stem, keys: Object.keys(q.expected.values ?? {}) }] as const),
);

/** The final-answer slots of a task: one per unknown it asks for (never the values themselves). */
export function finalSlotsFor(taskId: string): string[] {
  const spec = answerSpecById(taskId);
  if (!spec.final) return [];
  const question = ANSWERED_QUESTIONS.get(taskId);
  const keys = spec.finalKeys ?? question?.keys ?? [];
  return keys.map(key => finalSlotText(key, question?.stem));
}

/**
 * Writing rows a task offers at minimum: work rules (+ its lane), rows under its sub-items, or
 * proof-form rows. `itemCount` is the number of sub-items that carry their own rows (spec.itemRows).
 */
export function minimumWritingRows(spec: AnswerSpec, itemCount = 0): number {
  const lane = spec.lane ? 1 : 0;
  const lanes = spec.mode === 'two-ways' ? TWO_WAYS_LABELS.length : 1;
  return spec.minLines * lanes + lane + itemCount * (spec.itemRows ?? 0);
}

/**
 * Answer options are set in one column when any option is a sentence, otherwise in two. Length is
 * counted without spaces, because typeset math ('(2x + 35) + (5x − 19) = 180') is set tight.
 */
export const CHOICE_TWO_COLUMN_MAX_CHARS = 16;
export function choiceColumns(options: readonly string[]): 1 | 2 {
  return options.some(option => [...option.replace(/\s+/gu, '')].length > CHOICE_TWO_COLUMN_MAX_CHARS) ? 1 : 2;
}
