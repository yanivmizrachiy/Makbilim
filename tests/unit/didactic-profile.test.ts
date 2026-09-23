import { describe, expect, it } from 'vitest';
import questionPlan from '../../src/content/question-plan.json';
import { authoredMisconceptionTarget, didacticProfiles } from '../../src/didactics/profile';

type PlanTask = { id: string; page: number; format: string; misconceptionTarget?: string };
type PlanUnit = { unit: number; tasks: PlanTask[] };

const planTasks = (questionPlan.units as PlanUnit[])
  .flatMap(unit => unit.tasks.map(task => ({ ...task, unit: unit.unit })));

// The two strings profile.ts used to substitute when a task had no authored target.
// They must never reappear: each task names the specific error it is built to surface.
const formerGenericFallbacks = [
  'שימוש במשפט ישיר במקום במשפט ההפוך',
  'בחירת קשר זוויות או משפט שאינו מתאים לנתונים',
];

const requiredFingerprintKeys = [
  'skill',
  'theoremIds',
  'topology',
  'givenType',
  'targetType',
  'reasoningSteps',
  'responseMode',
  'difficulty',
  'valueFamily',
  'symbolFamily',
  'wordingArchetype',
  'instructionVerb',
  'misconceptionTarget',
  'sourceArchetypeRefs',
  'transferDemand',
] as const;

describe('canonical didactic profiles', () => {
  it('covers exactly the 58 authored tasks with unique fingerprints', () => {
    expect(didacticProfiles).toHaveLength(58);
    expect(new Set(didacticProfiles.map(profile => profile.id)).size).toBe(58);
    expect(new Set(didacticProfiles.map(profile => profile.fingerprint)).size).toBe(58);
  });

  it('keeps every mandatory profile field populated', () => {
    for (const profile of didacticProfiles) {
      expect(profile.learningObjective.trim(), `learningObjective ${profile.id}`).not.toBe('');
      expect(profile.assessmentPurpose.trim(), `assessmentPurpose ${profile.id}`).not.toBe('');
      expect(profile.responseMode.trim(), `responseMode ${profile.id}`).not.toBe('');
      expect(profile.reasoningSteps, `reasoningSteps ${profile.id}`).toBeGreaterThan(0);
      expect(profile.misconceptionTarget.trim(), `misconceptionTarget ${profile.id}`).not.toBe('');
      expect(profile.evidenceOfLearning.trim(), `evidenceOfLearning ${profile.id}`).not.toBe('');
      expect(profile.wordingArchetype.trim(), `wordingArchetype ${profile.id}`).not.toBe('');
      expect(profile.instructionVerb.trim(), `instructionVerb ${profile.id}`).not.toBe('');
      expect(profile.sourceArchetypeRefs.length, `sourceArchetypeRefs ${profile.id}`).toBeGreaterThan(0);
      expect(profile.transferDemand, `transferDemand ${profile.id}`).toBeGreaterThan(0);
    }
  });

  it('fingerprints include every semantic component required by SPEC section 12', () => {
    for (const profile of didacticProfiles) {
      const fingerprint = JSON.parse(profile.fingerprint) as Record<string, unknown>;
      for (const key of requiredFingerprintKeys) {
        expect(fingerprint, `${profile.id} missing fingerprint key ${key}`).toHaveProperty(key);
      }
      expect(String(fingerprint.topology ?? '').trim(), `topology ${profile.id}`).not.toBe('');
      expect(String(fingerprint.givenType ?? '').trim(), `givenType ${profile.id}`).not.toBe('');
      expect(String(fingerprint.targetType ?? '').trim(), `targetType ${profile.id}`).not.toBe('');
      expect(String(fingerprint.valueFamily ?? '').trim(), `valueFamily ${profile.id}`).not.toBe('');
      expect(String(fingerprint.symbolFamily ?? '').trim(), `symbolFamily ${profile.id}`).not.toBe('');
      expect(Array.isArray(fingerprint.sourceArchetypeRefs), `sourceArchetypeRefs ${profile.id}`).toBe(true);
    }
  });
});

describe('authored misconception targets (SPEC 5.2, 6, 6.1)', () => {
  const profileById = new Map(didacticProfiles.map(profile => [profile.id, profile]));

  it('every unit 1–4 task authors its own specific Hebrew target in question-plan.json', () => {
    expect(planTasks).toHaveLength(58);
    expect([...new Set(planTasks.map(task => task.unit))]).toEqual([1, 2, 3, 4]);

    for (const task of planTasks) {
      const authored = task.misconceptionTarget;
      expect(typeof authored, `${task.id} has no authored misconceptionTarget`).toBe('string');
      const target = (authored ?? '').trim();
      expect(target.length, `${task.id} misconceptionTarget is too short to be specific`).toBeGreaterThanOrEqual(8);
      expect(target, `${task.id} misconceptionTarget must be Hebrew`).toMatch(/[\u0590-\u05FF]/);
      expect(target, `${task.id} misconceptionTarget contains English or internal jargon`).not.toMatch(/[A-Za-z]{3,}/);
      expect(formerGenericFallbacks, `${task.id} uses a generic fallback target`).not.toContain(target);

      const profile = profileById.get(task.id);
      expect(profile, `${task.id} has no didactic profile`).toBeDefined();
      expect(profile?.misconceptionTarget, `${task.id} profile does not use the authored target`).toBe(target);
    }
  });

  it('never repeats a target: each of the 58 tasks names a distinct error', () => {
    const byTarget = new Map<string, string[]>();
    for (const task of planTasks) {
      const target = (task.misconceptionTarget ?? '').trim();
      byTarget.set(target, [...(byTarget.get(target) ?? []), task.id]);
    }
    const repeated = [...byTarget.entries()].filter(([, ids]) => ids.length > 1).map(([target, ids]) => `${ids.join(' + ')}: ${target}`);
    expect(repeated, 'identical misconception targets').toEqual([]);
  });

  it('tasks on the same page never share a near-identical target (not only an identical one)', () => {
    const words = (text: string) => new Set(text.replace(/[^֐-׿\s]/g, ' ').split(/\s+/).filter(word => word.length > 1));
    const jaccard = (a: Set<string>, b: Set<string>) => {
      const shared = [...a].filter(word => b.has(word)).length;
      return shared / (a.size + b.size - shared || 1);
    };
    const byPage = new Map<string, typeof planTasks>();
    for (const task of planTasks) {
      const key = `U${task.unit}-page-${task.page}`;
      byPage.set(key, [...(byPage.get(key) ?? []), task]);
    }
    for (const [page, tasks] of byPage) {
      for (let i = 0; i < tasks.length; i += 1) {
        for (let j = i + 1; j < tasks.length; j += 1) {
          const a = tasks[i]!;
          const b = tasks[j]!;
          const similarity = jaccard(words(a.misconceptionTarget ?? ''), words(b.misconceptionTarget ?? ''));
          expect(similarity, `${page}: ${a.id} and ${b.id} have near-identical targets (${similarity.toFixed(2)})`).toBeLessThan(0.6);
        }
      }
    }
  });

  it('fails hard on a missing or blank target instead of substituting a generic one', () => {
    expect(() => authoredMisconceptionTarget({ id: 'U9-P9-Z' })).toThrow(/U9-P9-Z.*misconceptionTarget/);
    expect(() => authoredMisconceptionTarget({ id: 'U9-P9-Y', misconceptionTarget: '   ' })).toThrow(/misconceptionTarget/);
    expect(authoredMisconceptionTarget({ id: 'U9-P9-X', misconceptionTarget: '  בלבול צד החותך  ' })).toBe('בלבול צד החותך');
  });
});
