import questionPlan from '../content/question-plan.json';
import { unit1Questions } from '../content/questions-unit1';
import { unit2Questions } from '../content/questions-unit2';
import { unit3Questions } from '../content/questions-unit3';
import { unit4Questions } from '../content/questions-unit4';

export type DemandLevel = 1 | 2 | 3 | 4 | 5;

export type DidacticProfile = {
  id: string;
  unit: 1 | 2 | 3 | 4;
  page: number;
  difficulty: string;
  conceptualDemand: DemandLevel;
  reasoningDepth: DemandLevel;
  algebraicDemand: DemandLevel;
  visualDemand: string;
  languageDemand: DemandLevel;
  decisionDemand: DemandLevel;
  transferDemand: DemandLevel;
  learningObjective: string;
  assessmentPurpose: string;
  prerequisites: string[];
  theoremIds: string[];
  format: string;
  responseMode: string;
  reasoningSteps: number;
  misconceptionTarget: string;
  evidenceOfLearning: string;
  wordingArchetype: string;
  instructionVerb: string;
  sourceArchetypeRefs: string[];
  numericBeforeAlgebra: boolean;
  fingerprint: string;
};

type RawTask = {
  id: string;
  page: number;
  difficulty: string;
  visualDemand: string;
  format: string;
  skill: string;
  theoremIds?: string[];
  instructionVerb?: string;
  learningObjective?: string;
  misconceptionTarget?: string;
  progressionGain?: string;
  numericBeforeAlgebra?: boolean;
  requiresJustificationLane?: boolean;
};

type RawUnit = {
  unit: number;
  title: string;
  tasks?: RawTask[];
};

type ContentQuestion = {
  id: string;
  stem: string;
  subparts?: string[];
  choices?: string[];
  diagram?: {
    topology?: string;
    lineLabels?: string[];
    pointLabels?: string[];
    parallelGiven?: boolean;
    parallelGivens?: string[];
    givens?: string[];
    targets?: string[];
    target?: string;
    highlights?: string[];
  };
  expected?: Record<string, unknown>;
};

const contentQuestions = [
  ...unit1Questions,
  ...unit2Questions,
  ...unit3Questions,
  ...unit4Questions,
] as ContentQuestion[];

const contentById = new Map(contentQuestions.map(question => [question.id, question]));

const difficultyValue = (difficulty: string): DemandLevel => {
  const n = Number(difficulty.replace(/\D/g, ''));
  if (n >= 1 && n <= 5) return n as DemandLevel;
  return 1;
};

const visualValue = (visualDemand: string): DemandLevel => {
  const n = Number(visualDemand.replace(/\D/g, ''));
  if (n >= 1 && n <= 4) return n as DemandLevel;
  return 1;
};

const containsAlgebra = (task: RawTask) =>
  /algebra|equation|variable|unknown|find-x/i.test(`${task.format} ${task.skill}`) || task.numericBeforeAlgebra === false;

const reasoningStepsFor = (task: RawTask, difficulty: DemandLevel) => {
  if (/proof|two-step|route|sufficient|error|compare|combined|mixed/i.test(`${task.format} ${task.skill}`)) return Math.min(5, Math.max(2, difficulty)) as DemandLevel;
  return Math.min(5, Math.max(1, difficulty - 1)) as DemandLevel;
};

const responseModeFor = (format: string) => {
  if (/multiple-choice|choose|choice/i.test(format)) return 'בחירה';
  if (/table/i.test(format)) return 'טבלה';
  if (/sentence-completion|fill/i.test(format)) return 'השלמה';
  if (/proof|justify|reason|determine|error|sufficient/i.test(format)) return 'נימוק-כתוב';
  if (/matching|match/i.test(format)) return 'התאמה';
  if (/mark|identify|classification/i.test(format)) return 'זיהוי-וסימון';
  return 'תשובה-כתובה';
};

const prerequisitesFor = (unit: number, task: RawTask) => {
  const base: string[] = [];
  if (unit >= 2) base.push('זיהוי זוויות מתאימות ומתחלפות');
  if (unit >= 3) base.push('שליטה במשפטים הישירים וחישובי זוויות');
  if (unit >= 4) base.push('נימוק והוכחה קצרים');
  if (containsAlgebra(task)) base.push('פתרון משוואה ליניארית');
  return base;
};

/**
 * SPEC 5.2 / 6 / 6.1: every original task names the specific student error it is
 * designed to surface. The target must be authored per task in question-plan.json;
 * there is deliberately no generic fallback, so a missing or blank value fails loudly.
 */
export const authoredMisconceptionTarget = (task: { id: string; misconceptionTarget?: string | undefined }): string => {
  const target = task.misconceptionTarget?.trim() ?? '';
  if (!target) {
    throw new Error(`Task ${task.id} has no authored misconceptionTarget in question-plan.json (SPEC 6.1)`);
  }
  return target;
};

const wordingArchetypeFor = (format: string) => {
  if (/sentence-completion|fill/i.test(format)) return 'השלימו את המשפט/הנימוק';
  if (/multiple-choice|choose|choice/i.test(format)) return 'בחרו את התשובה או המשפט המתאים';
  if (/proof/i.test(format)) return 'הוכיחו ונמקו';
  if (/table/i.test(format)) return 'השלימו/היעזרו בטבלה';
  if (/true-false/i.test(format)) return 'קבעו אם הטענה נכונה או לא נכונה';
  if (/matching|match/i.test(format)) return 'התאימו';
  if (/mark|identify|classification/i.test(format)) return 'סמנו/כתבו/קבעו לפי השרטוט';
  return 'חשבו/מצאו/קבעו ונמקו';
};

const sourceRefsFor = (unit: number) => {
  if (unit === 1) return ['sources/manifest.json#core-source', 'sources/manifest.json#worksheet-source'];
  if (unit === 2) return ['sources/manifest.json#core-source', 'sources/manifest.json#worksheet-source', 'sources/manifest.json#instructional-source'];
  if (unit === 3) return ['sources/manifest.json#core-source', 'sources/manifest.json#instructional-source'];
  return ['sources/manifest.json#core-source', 'sources/manifest.json#visual-task-reference'];
};

const givenTypeFor = (question: ContentQuestion) => {
  const diagram = question.diagram;
  if (!diagram) return 'statement-only';
  const parallel = diagram.parallelGiven === true || (diagram.parallelGivens?.length ?? 0) > 0;
  const givens = diagram.givens ?? [];
  const numeric = givens.some(value => /\d/.test(value));
  const equality = givens.some(value => /=/.test(value));
  return [parallel ? 'parallel' : 'not-parallel-given', numeric ? 'numeric' : 'non-numeric', equality ? 'equality' : 'no-equality'].join('+');
};

const targetTypeFor = (question: ContentQuestion) => {
  const targets = question.diagram?.targets ?? [];
  if (targets.length) return targets.join(' & ');
  if (question.diagram?.target) return question.diagram.target;
  const expectedKeys = Object.keys(question.expected ?? {}).sort();
  if (expectedKeys.length) return `expected:${expectedKeys.join('+')}`;
  if (question.choices?.length) return 'choice-selection';
  if (question.subparts?.length) return 'multi-part-response';
  return 'open-response';
};

const valueFamilyFor = (task: RawTask, question: ContentQuestion) => {
  if (containsAlgebra(task)) return 'algebraic';
  const text = `${question.stem} ${JSON.stringify(question.diagram?.givens ?? [])} ${JSON.stringify(question.expected ?? {})}`;
  if (/\d/.test(text)) return 'numeric';
  if (/[α-ωΑ-Ω]/u.test(text)) return 'symbolic';
  return 'verbal';
};

const symbolFamilyFor = (question: ContentQuestion) => {
  const lineLabels = question.diagram?.lineLabels ?? [];
  const pointLabels = question.diagram?.pointLabels ?? [];
  const symbols = [...lineLabels, ...pointLabels];
  return symbols.length ? symbols.join(',') : 'no-diagram-symbols';
};

const rawUnits = questionPlan.units as RawUnit[];

export const didacticProfiles: DidacticProfile[] = rawUnits
  .filter(unit => unit.unit >= 1 && unit.unit <= 4)
  .flatMap(unit => (unit.tasks ?? []).map(task => {
    const difficulty = difficultyValue(task.difficulty);
    const visual = visualValue(task.visualDemand);
    const algebra = containsAlgebra(task);
    const reasoning = reasoningStepsFor(task, difficulty);
    const responseMode = responseModeFor(task.format);
    const theoremIds = task.theoremIds ?? [];
    const progressionGain = task.progressionGain ?? task.skill;
    const question = contentById.get(task.id);
    if (!question) throw new Error(`Missing authored content for didactic profile ${task.id}`);

    const wordingArchetype = wordingArchetypeFor(task.format);
    const misconceptionTarget = authoredMisconceptionTarget(task);
    const transferDemand = Math.max(1, Math.min(5, visual + (unit.unit >= 3 ? 1 : 0))) as DemandLevel;
    const sourceArchetypeRefs = sourceRefsFor(unit.unit);
    const topology = question.diagram?.topology ?? 'statement-only';
    const givenType = givenTypeFor(question);
    const targetType = targetTypeFor(question);
    const valueFamily = valueFamilyFor(task, question);
    const symbolFamily = symbolFamilyFor(question);

    const fingerprint = JSON.stringify({
      skill: task.skill,
      theoremIds,
      topology,
      givenType,
      targetType,
      reasoningSteps: reasoning,
      responseMode,
      difficulty: task.difficulty,
      valueFamily,
      symbolFamily,
      wordingArchetype,
      instructionVerb: task.instructionVerb ?? 'קבעו',
      misconceptionTarget,
      sourceArchetypeRefs,
      transferDemand,
      progressionGain,
    });

    return {
      id: task.id,
      unit: unit.unit as 1 | 2 | 3 | 4,
      page: task.page,
      difficulty: task.difficulty,
      conceptualDemand: difficulty,
      reasoningDepth: reasoning,
      algebraicDemand: algebra ? Math.max(2, Math.min(5, difficulty)) as DemandLevel : 1,
      visualDemand: task.visualDemand,
      languageDemand: /proof|error|sufficient|claim|reason/i.test(`${task.format} ${task.skill}`) ? Math.min(5, difficulty + 1) as DemandLevel : Math.max(1, difficulty - 1) as DemandLevel,
      decisionDemand: /choose|route|sufficient|error|compare|proof/i.test(`${task.format} ${task.skill}`) ? Math.min(5, difficulty + 1) as DemandLevel : difficulty,
      transferDemand,
      learningObjective: task.learningObjective ?? task.skill.replaceAll('-', ' '),
      assessmentPurpose: `לבדוק שליטה ב-${task.skill.replaceAll('-', ' ')}`,
      prerequisites: prerequisitesFor(unit.unit, task),
      theoremIds,
      format: task.format,
      responseMode,
      reasoningSteps: reasoning,
      misconceptionTarget,
      evidenceOfLearning: `התלמיד מבצע בהצלחה משימת ${responseMode} ומנמק בהתאם לנתונים`,
      wordingArchetype,
      instructionVerb: task.instructionVerb ?? 'קבעו',
      sourceArchetypeRefs,
      numericBeforeAlgebra: task.numericBeforeAlgebra ?? !algebra,
      fingerprint,
    } satisfies DidacticProfile;
  }));

if (didacticProfiles.length !== questionPlan.originalTaskCount) {
  throw new Error(`Expected ${questionPlan.originalTaskCount} complete didactic profiles, found ${didacticProfiles.length}`);
}

if (new Set(didacticProfiles.map(profile => profile.fingerprint)).size !== didacticProfiles.length) {
  throw new Error('Didactic profile fingerprints must be unique across authored tasks');
}
