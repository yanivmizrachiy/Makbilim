import { describe, expect, it } from 'vitest';
import { unit2Questions } from '../../src/content/questions-unit2';

describe('Unit 2 — תרגילי חישוב', () => {
  it('contains exactly 24 authored student questions', () => {
    expect(unit2Questions).toHaveLength(24);
  });

  it('uses six local pages with four questions per page', () => {
    const counts = new Map<number, number>();
    for (const q of unit2Questions) counts.set(q.page, (counts.get(q.page) ?? 0) + 1);
    expect([...counts.entries()]).toEqual([
      [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4]
    ]);
  });

  it('keeps algebra out of the first three pages', () => {
    const early = unit2Questions.filter(q => q.page <= 3);
    for (const q of early) {
      expect(q.stem).not.toMatch(/(?:^|[^A-Za-z])x(?:[^A-Za-z]|$)/);
      expect(q.stem).not.toMatch(/(?:^|[^A-Za-z])y(?:[^A-Za-z]|$)/);
    }
  });

  it('requires a justification lane for every algebra question', () => {
    const algebra = unit2Questions.filter(q => /(?:^|[^A-Za-z])[xy](?:[^A-Za-z]|$)/.test(q.stem));
    expect(algebra.length).toBeGreaterThan(0);
    for (const q of algebra) expect(q.justificationLane).toBe(true);
  });

  it('has no duplicate student-facing stems', () => {
    const stems = unit2Questions.map(q => q.stem.trim());
    expect(new Set(stems).size).toBe(stems.length);
  });

  it('uses unique ids', () => {
    const ids = unit2Questions.map(q => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps all expected angle measures inside the geometric range', () => {
    for (const q of unit2Questions) {
      for (const [key, value] of Object.entries(q.expected.values ?? {})) {
        if (key === 'x' || key === 'y' || key.includes('+')) continue;
        if (typeof value === 'number') {
          expect(value, `${q.id} ${key}`).toBeGreaterThan(0);
          expect(value, `${q.id} ${key}`).toBeLessThan(180);
        }
      }
    }
  });

  it('preserves numeric practice after algebra as transfer rather than introducing algebra too early', () => {
    expect(unit2Questions.filter(q => q.page === 6).every(q => !/(?:^|[^A-Za-z])[xy](?:[^A-Za-z]|$)/.test(q.stem))).toBe(true);
  });
});
