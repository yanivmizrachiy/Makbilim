import { describe, expect, it } from 'vitest';
import { unit1Questions } from '../../src/content/questions-unit1';
import { unit1RelationTableCases } from '../../src/pages/Unit1Continuation';
import { alternateInteriorPairs, alternatePairs, correspondingPair } from '../../src/geometry/relations';

describe('Unit 1 conceptual integrity', () => {
  it('contains 14 progressively structured questions', () => {
    expect(unit1Questions).toHaveLength(14);
    expect(new Set(unit1Questions.map(q => q.id)).size).toBe(14);
  });

  it('uses grayscale-safe non-color cues for visual identification', () => {
    const arcQuestion = unit1Questions.find(item => item.id === 'U1-P1-D')!;
    const arcCopy = [arcQuestion.stem, ...(arcQuestion.subparts ?? [])].join(' ');
    expect(arcCopy).toContain('קשת');
    expect(arcCopy).not.toMatch(/אדום|כחול|אפור/);

    const rotatedQuestion = unit1Questions.find(item => item.id === 'U1-P2-B')!;
    const rotatedCopy = [rotatedQuestion.stem, ...(rotatedQuestion.subparts ?? [])].join(' ');
    expect(rotatedCopy).toMatch(/מיקום|מיקומו/);
    expect(rotatedCopy).not.toMatch(/אדום|כחול|אפור/);
  });

  it('keeps the parallel-lines condition explicit in theorem recall', () => {
    const corresponding = unit1Questions.find(q => q.id === 'U1-P2-C')!;
    const alternate = unit1Questions.find(q => q.id === 'U1-P2-D')!;
    expect(corresponding.stem).toBe('השלימו מילה אחת בלבד: זוויות מתאימות בין ישרים ______ שוות.');
    expect(alternate.stem).toBe('השלימו מילה אחת בלבד: זוויות ______ בין ישרים מקבילים שוות.');
    expect((corresponding.stem.match(/______/g) ?? [])).toHaveLength(1);
    expect((alternate.stem.match(/______/g) ?? [])).toHaveLength(1);
  });

  it('explicitly challenges the misconception that alternate angles are always equal', () => {
    const q = unit1Questions.find(item => item.id === 'U1-P3-A')!;
    expect(q.stem).toContain('זוויות מתחלפות בין ישרים מקבילים שוות');
  });

  it('includes both non-parallel counterexamples and a second boy-girl critical claim', () => {
    const tableCases = unit1RelationTableCases.filter(item => !item.parallel);
    expect(tableCases.some(item => item.relation === 'מתאימות' && item.equalityConclusion === 'לא ניתן לקבוע')).toBe(true);
    expect(tableCases.some(item => item.relation === 'מתחלפות' && item.equalityConclusion === 'לא ניתן לקבוע')).toBe(true);
    const correction = unit1Questions.find(item => item.id === 'U1-P3-D')!;
    expect(correction.stem).toContain('מאיה');
    expect(correction.stem).toContain('יואב');
    expect(correction.stem).toContain('זוויות מתאימות שוות');
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

  it('covers all four combinations of relation type and parallel condition in the relation table', () => {
    expect(unit1RelationTableCases.map(({ relation, parallel, equalityConclusion }) => ({ relation, parallel, equalityConclusion }))).toEqual([
      { relation: 'מתאימות', parallel: true, equalityConclusion: 'כן' },
      { relation: 'מתאימות', parallel: false, equalityConclusion: 'לא ניתן לקבוע' },
      { relation: 'מתחלפות', parallel: true, equalityConclusion: 'כן' },
      { relation: 'מתחלפות', parallel: false, equalityConclusion: 'לא ניתן לקבוע' },
    ]);
  });

  it('uses structurally valid angle pairs in every relation-table row', () => {
    const allAlternates = alternatePairs();
    for (const item of unit1RelationTableCases) {
      const normalized = item.marks.map(mark => ({ intersection: mark.intersection, sector: mark.sector }));
      if (item.relation === 'מתאימות') {
        expect(normalized).toEqual(correspondingPair(normalized[0]!.sector));
      } else {
        expect(allAlternates).toContainEqual(normalized);
      }
    }
  });
});
