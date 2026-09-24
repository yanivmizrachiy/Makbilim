/**
 * Task kinds — the student-facing "type of task" layer of the question hierarchy
 * (marker → task type → instruction → diagram → answer area → justification).
 *
 * Each didactic `format` in question-plan.json maps to exactly one kind, grouped by the
 * ACTIVITY the student performs (not by unit). A few formats mean different activities in
 * different tasks, so TASK_KIND_OVERRIDES pins those tasks explicitly.
 * tests/unit/task-kinds.test.ts fails if any task (or a future new format) is unmapped.
 */
import plan from './question-plan.json';

export type TaskKind =
  | 'completion'
  | 'identification'
  | 'calculation'
  | 'claim'
  | 'sufficiency'
  | 'algebra'
  | 'proof';

/** Short, natural Hebrew labels shown to the student. */
export const TASK_KIND_LABEL: Record<TaskKind, string> = {
  completion: 'השלמת משפט',
  identification: 'זיהוי',
  calculation: 'חישוב',
  claim: 'בדיקת טענה',
  sufficiency: 'האם ניתן להסיק?',
  algebra: 'אלגברה',
  proof: 'נימוק והוכחה',
};

/**
 * Kinds whose label is NOT printed on the student page (requirements יט / מא): on proof tasks the
 * instruction itself — הוכיחו, נמקו, השלימו, סדרו — already says what to do, and the „נימוק והוכחה”
 * eyebrow only spent space. The label still names the kind in the teacher guide.
 */
export const STUDENT_HIDDEN_KIND_LABELS: ReadonlySet<TaskKind> = new Set<TaskKind>(['proof']);

export const FORMAT_KIND: Readonly<Record<string, TaskKind>> = {
  'sentence-completion': 'completion',

  'mark-on-diagram': 'identification',
  matching: 'identification',
  classification: 'identification',
  'construction-and-explain': 'identification',
  'multiple-choice': 'identification',
  table: 'identification',

  'numeric-direct': 'calculation',
  'two-step-numeric': 'calculation',
  'context-numeric': 'calculation',
  'numeric-reason': 'calculation',
  'route-choice': 'calculation',
  'table-lookup': 'calculation',
  'redundant-data': 'calculation',
  'two-transversals': 'calculation',
  'mixed-calculation': 'calculation',

  'true-false': 'claim',
  'claim-comparison': 'claim',
  'error-correction': 'claim',
  'error-analysis': 'claim',
  'proof-error': 'claim',
  'proof-comparison': 'claim',
  'direct-vs-converse': 'claim',

  'sufficient-data': 'sufficiency',
  'numeric-parallelism': 'sufficiency',

  'simple-algebra': 'algebra',
  'two-expression-algebra': 'algebra',
  'algebra-then-angle': 'algebra',
  'equation-choice': 'algebra',
  'two-variable-light': 'algebra',
  'algebra-for-parallelism': 'algebra',

  'choose-reason': 'proof',
  'fill-reason': 'proof',
  'match-claim-reason': 'proof',
  'determine-justify': 'proof',
  'order-proof': 'proof',
  'fill-proof-line': 'proof',
  'short-proof': 'proof',
  'proof-with-extra-data': 'proof',
  'short-parallelism-proof': 'proof',
};

/** Tasks whose format alone does not say which activity they are. */
export const TASK_KIND_OVERRIDES: Readonly<Record<string, TaskKind>> = {
  // Table asks "can we conclude the angles are equal?" — the key parallel-condition skill.
  'U1-P3-B': 'sufficiency',
  // Numeric table: read values and compute.
  'U2-P3-A': 'calculation',
  // Multiple choice between angle sizes — a calculation, not an identification.
  'U2-P1-C': 'calculation',
};

export function taskKindFor(taskId: string, format: string): TaskKind {
  const kind = TASK_KIND_OVERRIDES[taskId] ?? FORMAT_KIND[format];
  if (!kind) throw new Error(`Task ${taskId}: format "${format}" has no task kind — add it to FORMAT_KIND.`);
  return kind;
}

/** The didactic plan is the single source of each task's format. */
const FORMAT_BY_TASK_ID: ReadonlyMap<string, string> = new Map(
  plan.units.flatMap(unit => unit.tasks.map(task => [task.id, task.format] as const)),
);

/** Didactic format of an original task (units 1-4), as question-plan.json records it. */
export function taskFormatById(taskId: string): string {
  const format = FORMAT_BY_TASK_ID.get(taskId);
  if (!format) throw new Error(`Unknown task id "${taskId}" — it is not in question-plan.json.`);
  return format;
}

/** Kind of an original task (units 1-4), looked up by its id in question-plan.json. */
export function taskKindById(taskId: string): TaskKind {
  return taskKindFor(taskId, taskFormatById(taskId));
}
