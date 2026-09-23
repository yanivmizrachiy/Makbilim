import { describe, expect, it } from 'vitest';
import plan from '../../src/content/question-plan.json';
import { FORMAT_KIND, TASK_KIND_LABEL, TASK_KIND_OVERRIDES, taskKindFor } from '../../src/content/task-kinds';

type PlanTask = { id: string; format: string };

const collectTasks = (node: unknown): PlanTask[] => {
  if (Array.isArray(node)) return node.flatMap(collectTasks);
  if (node && typeof node === 'object') {
    const record = node as Record<string, unknown>;
    const own = typeof record.id === 'string' && typeof record.format === 'string'
      ? [{ id: record.id, format: record.format }]
      : [];
    return own.concat(Object.values(record).flatMap(collectTasks));
  }
  return [];
};

const tasks = collectTasks(plan.units);

describe('task kinds (student-facing task-type layer)', () => {
  it('covers every one of the 58 original tasks', () => {
    expect(tasks).toHaveLength(58);
    for (const task of tasks) expect(() => taskKindFor(task.id, task.format)).not.toThrow();
  });

  it('maps every format used in the plan, and nothing unused', () => {
    const used = new Set(tasks.map(task => task.format));
    expect([...used].filter(format => !(format in FORMAT_KIND))).toEqual([]);
    expect(Object.keys(FORMAT_KIND).filter(format => !used.has(format))).toEqual([]);
  });

  it('only overrides real tasks, and only where the override changes the kind', () => {
    const byId = new Map(tasks.map(task => [task.id, task]));
    for (const [id, kind] of Object.entries(TASK_KIND_OVERRIDES)) {
      const task = byId.get(id);
      expect(task, id).toBeDefined();
      expect(FORMAT_KIND[task!.format], id).not.toBe(kind);
    }
  });

  it('uses natural Hebrew labels with no internal or demo wording', () => {
    for (const label of Object.values(TASK_KIND_LABEL)) {
      expect(label).toMatch(/[֐-׿]/);
      expect(label).not.toMatch(/[A-Za-z]|demo|placeholder|format|kind/i);
    }
  });

  it('uses all seven kinds somewhere in the booklet', () => {
    const usedKinds = new Set(tasks.map(task => taskKindFor(task.id, task.format)));
    expect([...usedKinds].sort()).toEqual(Object.keys(TASK_KIND_LABEL).sort());
  });
});
