import { describe, expect, it } from 'vitest';
import { unit4Questions } from '../../src/content/questions-unit4';

describe('Unit 4 — משפטים הפוכים', () => {
  it('contains exactly 8 questions across two pages', () => {
    expect(unit4Questions).toHaveLength(8);
    const counts = new Map<number, number>();
    for (const q of unit4Questions) counts.set(q.page, (counts.get(q.page) ?? 0) + 1);
    expect([...counts.entries()]).toEqual([[1, 4], [2, 4]]);
  });

  it('has unique ids and stems', () => {
    expect(new Set(unit4Questions.map(q => q.id)).size).toBe(8);
    expect(new Set(unit4Questions.map(q => q.stem.trim())).size).toBe(8);
  });

  it('introduces converse theorem language before algebra', () => {
    const algebraIndex = unit4Questions.findIndex(q => /(?:^|[^A-Za-z])x(?:[^A-Za-z]|$)/.test(q.stem));
    expect(algebraIndex).toBeGreaterThan(3);
    expect(unit4Questions[0]!.stem).toContain('השלימו את המשפט');
    expect(unit4Questions[1]!.stem).toContain('השלימו את המשפט');
  });

  it('requires justification space in the converse algebra question', () => {
    const algebra = unit4Questions.find(q => q.id === 'U4-P2-C');
    expect(algebra?.justificationLane).toBe(true);
    expect(algebra?.expected.values?.x).toBe(20);
  });

  it('states the parallel conclusion only after a valid corresponding or alternate equality condition', () => {
    const directApplications = ['U4-P1-D', 'U4-P2-A'];
    for (const id of directApplications) {
      const q = unit4Questions.find(item => item.id === id);
      expect(q?.diagram?.parallelGiven).toBe(false);
      expect(q?.expected.conclusion).toMatch(/∥/);
    }
  });

  it('ends with a combined direct-and-converse proof', () => {
    const final = unit4Questions.at(-1);
    expect(final?.id).toBe('U4-P2-D');
    expect(final?.expected.proof?.some(line => line.includes('זוויות מתאימות בין הישרים המקבילים'))).toBe(true);
    expect(final?.expected.proof?.some(line => line.includes('המשפט ההפוך'))).toBe(true);
  });
});
