import { describe, expect, it } from 'vitest';
import questionPlan from '../../src/content/question-plan.json';
import pageManifest from '../../src/content/page-manifest.json';
import { unit1Questions } from '../../src/content/questions-unit1';
import { unit2Questions } from '../../src/content/questions-unit2';
import { unit3Questions } from '../../src/content/questions-unit3';
import { unit4Questions } from '../../src/content/questions-unit4';
import { teacherAnswerKey } from '../../src/content/answer-key';
import { didacticProfiles } from '../../src/didactics/profile';

const allQuestions = [
  ...unit1Questions.map(q => ({ ...q, unit: 1 as const })),
  ...unit2Questions.map(q => ({ ...q, unit: 2 as const })),
  ...unit3Questions.map(q => ({ ...q, unit: 3 as const })),
  ...unit4Questions.map(q => ({ ...q, unit: 4 as const })),
];

const plannedTasks = questionPlan.units
  .filter(unit => unit.unit <= 4)
  .flatMap(unit => unit.tasks.map(task => ({ ...task, unit: unit.unit })));

const difficultyValue = (value: string) => Number(value.replace(/\D/g, ''));
const visualValue = (value: string) => Number(value.replace(/\D/g, ''));

const studentText = (question: Record<string, unknown>) => {
  const parts: string[] = [];
  if (typeof question.stem === 'string') parts.push(question.stem);
  if (Array.isArray(question.subparts)) parts.push(...question.subparts.filter((x): x is string => typeof x === 'string'));
  if (Array.isArray(question.choices)) parts.push(...question.choices.filter((x): x is string => typeof x === 'string'));
  return parts.join(' ');
};

const hasAlgebra = (text: string) => /(?:^|[^A-Za-z])[xyab](?:[^A-Za-z]|$)|\b(?:alpha|beta)\b/i.test(text) || /[αβ]/u.test(text);

const orientationBucket = (deg: number) => {
  const normalized = ((deg % 180) + 180) % 180;
  if (normalized < 22.5 || normalized >= 157.5) return 'horizontal';
  if (normalized < 67.5) return 'diag-positive';
  if (normalized < 112.5) return 'vertical';
  return 'diag-negative';
};

describe('canonical deep workbook contract', () => {
  it('keeps plan, authored content, answer key and didactic profiles in exact ID parity', () => {
    const planIds = plannedTasks.map(task => task.id).sort();
    const contentIds = allQuestions.map(question => question.id).sort();
    const answerIds = teacherAnswerKey.map(entry => entry.id).sort();
    const profileIds = didacticProfiles.map(profile => profile.id).sort();

    expect(planIds).toHaveLength(58);
    expect(new Set(planIds).size).toBe(58);
    expect(contentIds).toEqual(planIds);
    expect(answerIds).toEqual(planIds);
    expect(profileIds).toEqual(planIds);
  });

  it('enforces exact unit and page architecture', () => {
    expect(pageManifest.originalPageCount).toBe(14);
    expect(pageManifest.curriculumUnit.pages).toBe(4);
    expect(pageManifest.studentPageCount).toBe(18);

    const expected = new Map([
      [1, { tasks: 14, pages: 3 }],
      [2, { tasks: 24, pages: 6 }],
      [3, { tasks: 12, pages: 3 }],
      [4, { tasks: 8, pages: 2 }],
    ]);

    for (const [unit, contract] of expected) {
      const planUnit = questionPlan.units.find(item => item.unit === unit);
      const questions = allQuestions.filter(question => question.unit === unit);
      expect(planUnit?.taskCount).toBe(contract.tasks);
      expect(planUnit?.pages).toBe(contract.pages);
      expect(questions).toHaveLength(contract.tasks);
      expect(new Set(questions.map(question => question.page))).toEqual(new Set(Array.from({ length: contract.pages }, (_, i) => i + 1)));
    }
  });

  it('keeps converse theorems isolated to the advanced converse unit', () => {
    for (const task of plannedTasks) {
      const converse = task.theoremIds?.some(id => id === 'T3' || id === 'T4') ?? false;
      if (task.unit < 4) expect(converse, `${task.id} introduces a converse theorem too early`).toBe(false);
    }

    const unit4 = plannedTasks.filter(task => task.unit === 4);
    expect(unit4.some(task => task.theoremIds?.includes('T3'))).toBe(true);
    expect(unit4.some(task => task.theoremIds?.includes('T4'))).toBe(true);
  });

  it('prevents sharp didactic regressions or jumps inside each authored unit', () => {
    for (const unit of questionPlan.units.filter(item => item.unit <= 4)) {
      for (let i = 1; i < unit.tasks.length; i += 1) {
        const prev = unit.tasks[i - 1];
        const curr = unit.tasks[i];
        const difficultyDelta = difficultyValue(curr.difficulty) - difficultyValue(prev.difficulty);
        const visualDelta = visualValue(curr.visualDemand) - visualValue(prev.visualDemand);
        expect(Math.abs(difficultyDelta), `${prev.id} → ${curr.id}: difficulty jump`).toBeLessThanOrEqual(1);
        expect(Math.abs(visualDelta), `${prev.id} → ${curr.id}: visual jump`).toBeLessThanOrEqual(2);
      }
    }
  });

  it('enforces numbers before algebra and requires geometric justification for every algebra task', () => {
    for (const question of allQuestions) {
      const text = studentText(question as unknown as Record<string, unknown>);
      const algebra = hasAlgebra(text);

      if (question.unit === 1) expect(algebra, `${question.id} must remain pre-algebraic`).toBe(false);
      if (question.unit === 2 && question.page <= 3) expect(algebra, `${question.id} introduces algebra before page 4`).toBe(false);

      if ((question.unit === 2 || question.unit === 4) && algebra) {
        const candidate = question as unknown as { justificationLane?: boolean; expected?: { justification?: unknown } };
        expect(candidate.justificationLane, `${question.id} needs a justification lane`).toBe(true);
        expect(candidate.expected?.justification, `${question.id} needs a verified geometric justification`).toBeTruthy();
      }
    }
  });

  it('rejects internal/dev/demo language and malformed Hebrew typography in student-facing copy', () => {
    const banned = /\b(?:demo|sample|placeholder|fingerprint|validator|component)\b|\bD[1-5]\b|\bV[1-4]\b|כאן תופיע שאלה|בקרוב|בואו נגלה|מה אתם חושבים|אתגר מגניב/i;
    const badSpacing = /\s+[,.!?;:]|\d\s+°| {2,}/;

    for (const question of allQuestions) {
      const text = studentText(question as unknown as Record<string, unknown>);
      expect(text, `${question.id} must contain Hebrew`).toMatch(/[\u0590-\u05FF]/u);
      expect(text, `${question.id} exposes internal or demo copy`).not.toMatch(banned);
      expect(text, `${question.id} has malformed spacing or degree notation`).not.toMatch(badSpacing);
    }
  });

  it('requires real visual orientation diversity rather than one repeated diagram pose', () => {
    for (const unit of [1, 2, 3, 4] as const) {
      const diagrams = allQuestions
        .filter(question => question.unit === unit)
        .map(question => (question as unknown as { diagram?: { orientationDeg?: number } }).diagram?.orientationDeg)
        .filter((value): value is number => typeof value === 'number');

      expect(diagrams.length, `unit ${unit} should contain several diagrams`).toBeGreaterThanOrEqual(4);
      expect(new Set(diagrams).size, `unit ${unit} repeats exact orientations too often`).toBeGreaterThanOrEqual(Math.min(4, diagrams.length));
      expect(new Set(diagrams.map(orientationBucket)).size, `unit ${unit} lacks directional variety`).toBeGreaterThanOrEqual(2);
    }
  });

  it('requires multiple-choice options to be unique and internally consistent', () => {
    for (const question of allQuestions) {
      const candidate = question as unknown as { id: string; choices?: string[]; expected?: { choice?: string } };
      if (!candidate.choices) continue;
      expect(candidate.choices.length, `${candidate.id} needs a normal multiple-choice option count`).toBeGreaterThanOrEqual(3);
      expect(candidate.choices.length, `${candidate.id} has too many options`).toBeLessThanOrEqual(5);
      expect(new Set(candidate.choices).size, `${candidate.id} contains duplicate distractors`).toBe(candidate.choices.length);
      if (candidate.expected?.choice) expect(candidate.choices, `${candidate.id} expected choice is absent`).toContain(candidate.expected.choice);
    }
  });

  it('detects near-duplicate didactic fingerprints, not only identical IDs or stems', () => {
    const parsed = didacticProfiles.map(profile => ({ profile, fp: JSON.parse(profile.fingerprint) as Record<string, unknown> }));
    const keys = ['skill', 'theoremIds', 'topology', 'givenType', 'targetType', 'reasoningSteps', 'responseMode', 'difficulty', 'valueFamily', 'wordingArchetype', 'misconceptionTarget', 'transferDemand', 'progressionGain'];

    for (let i = 0; i < parsed.length; i += 1) {
      for (let j = i + 1; j < parsed.length; j += 1) {
        const a = parsed[i];
        const b = parsed[j];
        const same = keys.filter(key => JSON.stringify(a.fp[key]) === JSON.stringify(b.fp[key])).length;
        expect(same, `${a.profile.id} and ${b.profile.id} are too structurally similar (${same}/${keys.length})`).toBeLessThan(11);
      }
    }
  });

  it('requires complete, non-placeholder didactic profiles and unique fingerprints', () => {
    expect(didacticProfiles).toHaveLength(58);
    expect(new Set(didacticProfiles.map(profile => profile.fingerprint)).size).toBe(58);

    for (const profile of didacticProfiles) {
      expect(profile.learningObjective.trim().length, `${profile.id} missing learning objective`).toBeGreaterThan(2);
      expect(profile.assessmentPurpose.trim().length, `${profile.id} missing assessment purpose`).toBeGreaterThan(2);
      expect(profile.evidenceOfLearning.trim().length, `${profile.id} missing evidence of learning`).toBeGreaterThan(2);
      expect(profile.wordingArchetype.trim().length, `${profile.id} missing wording archetype`).toBeGreaterThan(2);
      expect(profile.instructionVerb.trim().length, `${profile.id} missing instruction verb`).toBeGreaterThan(1);
      expect(profile.sourceArchetypeRefs.length, `${profile.id} missing source archetype references`).toBeGreaterThan(0);
      expect(profile.reasoningSteps).toBeGreaterThanOrEqual(1);
      expect(profile.reasoningSteps).toBeLessThanOrEqual(5);
    }
  });
});
