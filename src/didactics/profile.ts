import questionPlan from '../content/question-plan.json';

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

const misconceptionFor = (task: RawTask) =>
  task.misconceptionTarget ??
  (/T3|T4/.test((task.theoremIds ?? []).join(''))
    ? 'שימוש במשפט ישיר במקום במשפט ההפוך'
    : 'בחירת קשר זוויות או משפט שאינו מתאים לנתונים');

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
      transferDemand: Math.max(1, Math.min(5, visual + (unit.unit >= 3 ? 1 : 0))) as DemandLevel,
      learningObjective: task.learningObjective ?? task.skill.replaceAll('-', ' '),
      assessmentPurpose: `לבדוק שליטה ב-${task.skill.replaceAll('-', ' ')}`,
      prerequisites: prerequisitesFor(unit.unit, task),
      theoremIds,
      format: task.format,
      responseMode,
      reasoningSteps: reasoning,
      misconceptionTarget: misconceptionFor(task),
      evidenceOfLearning: `התלמיד מבצע בהצלחה משימת ${responseMode} ומנמק בהתאם לנתונים`,
      wordingArchetype: wordingArchetypeFor(task.format),
      instructionVerb: task.instructionVerb ?? 'קבעו',
      sourceArchetypeRefs: ['sources/manifest.json'],
      numericBeforeAlgebra: task.numericBeforeAlgebra ?? !algebra,
      fingerprint: [
        task.skill,
        task.format,
        task.difficulty,
        task.visualDemand,
        theoremIds.join('+') || 'none',
        responseMode,
        progressionGain,
      ].join('|'),
    } satisfies DidacticProfile;
  }));

if (didacticProfiles.length !== 58) {
  throw new Error(`Expected 58 complete didactic profiles, found ${didacticProfiles.length}`);
}

if (new Set(didacticProfiles.map(profile => profile.fingerprint)).size !== didacticProfiles.length) {
  throw new Error('Didactic profile fingerprints must be unique across authored tasks');
}
