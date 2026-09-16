import { describe, expect, it } from 'vitest';
import questionPlan from '../../src/content/question-plan.json';
import { teacherAnswerKey } from '../../src/content/answer-key';

describe('teacher answer key coverage', () => {
  const plannedIds = questionPlan.units
    .filter(unit => unit.unit <= 4)
    .flatMap(unit => unit.tasks.map(task => task.id));

  const answerIds = teacherAnswerKey.map(entry => entry.id);

  it('covers exactly the 58 authored tasks', () => {
    expect(plannedIds).toHaveLength(58);
    expect(answerIds).toHaveLength(58);
    expect(new Set(plannedIds).size).toBe(58);
    expect(new Set(answerIds).size).toBe(58);
    expect([...answerIds].sort()).toEqual([...plannedIds].sort());
  });

  it('contains no empty authored answer', () => {
    for (const entry of teacherAnswerKey) {
      expect(entry.answer, `missing answer for ${entry.id}`).not.toBeNull();
      expect(entry.answer, `missing answer for ${entry.id}`).not.toBeUndefined();
      if (typeof entry.answer === 'string') {
        expect(entry.answer.trim(), `blank answer for ${entry.id}`).not.toBe('');
      }
    }
  });
});
