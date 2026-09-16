import { describe, expect, it } from 'vitest';
import { unit3Questions } from '../../src/content/questions-unit3';

describe('Unit 3 — תרגילי הוכחה', () => {
  it('contains exactly 12 questions across three pages', () => {
    expect(unit3Questions).toHaveLength(12);
    const counts = new Map<number, number>();
    for (const q of unit3Questions) counts.set(q.page, (counts.get(q.page) ?? 0) + 1);
    expect([...counts.entries()]).toEqual([[1, 4], [2, 4], [3, 4]]);
  });

  it('has unique ids and unique stems', () => {
    expect(new Set(unit3Questions.map(q => q.id)).size).toBe(12);
    expect(new Set(unit3Questions.map(q => q.stem.trim())).size).toBe(12);
  });

  it('does not use converse theorems as proof tools', () => {
    const forbidden = [
      'אם זוג זוויות מתאימות שוות',
      'אם זוג זוויות מתחלפות שוות',
      'אז שני הישרים מקבילים'
    ];
    for (const q of unit3Questions) {
      const studentText = [q.stem, ...(q.subparts ?? []), ...(q.choices ?? [])].join(' ');
      for (const phrase of forbidden) expect(studentText).not.toContain(phrase);
    }
  });

  it('moves from reason recognition to full proofs', () => {
    expect(unit3Questions.slice(0, 4).every(q => q.page === 1)).toBe(true);
    expect(unit3Questions.slice(8).every(q => q.page === 3)).toBe(true);
    expect(unit3Questions.filter(q => q.page === 3).some(q => q.stem.startsWith('נתון') && q.stem.includes('הוכיחו'))).toBe(true);
  });

  it('keeps proof conclusions supported by direct angle theorems or helper relations', () => {
    for (const q of unit3Questions) {
      const lines = q.expected.proof ?? [];
      for (const line of lines) {
        if (line.includes('זוויות מתאימות')) expect(line).toContain('ישרים מקבילים');
        if (line.includes('זוויות מתחלפות')) expect(line).toContain('ישרים מקבילים');
      }
    }
  });
});
