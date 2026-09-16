import { describe, expect, it } from 'vitest';
import { unit1Questions } from '../../src/content/questions-unit1';
import { alternateInteriorPairs, correspondingPair } from '../../src/geometry/relations';

describe('Unit 1 conceptual integrity', () => {
  it('contains 14 progressively structured questions', () => {
    expect(unit1Questions).toHaveLength(14);
    expect(new Set(unit1Questions.map(q => q.id)).size).toBe(14);
  });

  it('uses grayscale-safe arc wording rather than color-only wording', () => {
    for (const id of ['U1-P1-D', 'U1-P2-B']) {
      const q = unit1Questions.find(item => item.id === id)!;
      const copy = [q.stem, ...(q.subparts ?? [])].join(' ');
      expect(copy).toContain('קשת');
      expect(copy).not.toMatch(/אדום|כחול|אפור/);
    }
  });

  it('keeps the parallel-lines condition explicit in theorem recall', () => {
    const corresponding = unit1Questions.find(q => q.id === 'U1-P2-C')!;
    const alternate = unit1Questions.find(q => q.id === 'U1-P2-D')!;
    expect(corresponding.stem).toContain('אם שני ישרים ______ נחתכים על ידי ישר שלישי');
    expect(alternate.stem).toContain('אם שני ישרים ______ נחתכים על ידי ישר שלישי');
  });

  it('explicitly challenges the misconception that alternate angles are always equal', () => {
    const q = unit1Questions.find(item => item.id === 'U1-P3-A')!;
    expect(q.stem).toContain('השוויון מובטח כאשר הישרים מקבילים');
  });

  it('derives a corresponding, alternate and neither pair for page 1 classification', () => {
    expect(correspondingPair(0)).toEqual([
      { intersection: 'top', sector: 0 },
      { intersection: 'bottom', sector: 0 },
    ]);
    const alternates = alternateInteriorPairs(11, 71);
    expect(alternates).toContainEqual([
      { intersection: 'top', sector: 1 },
      { intersection: 'bottom', sector: 3 },
    ]);
    expect(alternates).not.toContainEqual([
      { intersection: 'top', sector: 2 },
      { intersection: 'bottom', sector: 1 },
    ]);
  });

  it('preserves the same conceptual pattern after rotation on page 2', () => {
    const alternates = alternateInteriorPairs(78, 24);
    expect(alternates).toContainEqual([
      { intersection: 'top', sector: 1 },
      { intersection: 'bottom', sector: 3 },
    ]);
    expect(alternates).not.toContainEqual([
      { intersection: 'top', sector: 2 },
      { intersection: 'bottom', sector: 1 },
    ]);
  });
});
