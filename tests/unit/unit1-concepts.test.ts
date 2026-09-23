import { describe, expect, it } from 'vitest';
import { unit1Questions } from '../../src/content/questions-unit1';
import { teacherAnswerKey } from '../../src/content/answer-key';
import { THEOREMS } from '../../src/content/theorems';
import { unit1RelationTableCases } from '../../src/pages/Unit1Continuation';
import { alternateInteriorPairs, alternatePairs, correspondingPair } from '../../src/geometry/relations';

const BLANK = '______';
const blanksIn = (text: string) => text.match(/_+/g) ?? [];
const WHOLE_WORD_BLANK = /(?:^|\s)______(?=[\s.,]|$)/;

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

  it('drills each canonical direct theorem one missing word per line, covering all four key words (SPEC 3.1)', () => {
    expect(THEOREMS.correspondingDirect.text).toBe('זוויות מתאימות בין ישרים מקבילים שוות.');
    expect(THEOREMS.alternateDirect.text).toBe('זוויות מתחלפות בין ישרים מקבילים שוות.');
    const drills = [
      { id: 'U1-P2-C', theorem: THEOREMS.correspondingDirect.text, angleType: 'מתאימות' },
      { id: 'U1-P2-D', theorem: THEOREMS.alternateDirect.text, angleType: 'מתחלפות' },
    ];
    const blankedWords = new Set<string>();

    for (const { id, theorem, angleType } of drills) {
      const q = unit1Questions.find(item => item.id === id)!;
      const lines = q.subparts ?? [];
      const answer = teacherAnswerKey.find(entry => entry.id === id)?.answer;

      expect(q.stem).toContain('השלימו');
      expect(q.stem, `${id} must tell the student that every line is the same theorem`).toContain('אותו משפט');
      expect(blanksIn(q.stem), `${id} stem must not contain a blank`).toHaveLength(0);
      expect(lines.length, `${id} needs at least three completion lines`).toBeGreaterThanOrEqual(3);
      expect(new Set(lines).size, `${id} repeats an identical line`).toBe(lines.length);
      expect(Array.isArray(answer), `${id} answer key must list one word per line`).toBe(true);
      const words = answer as string[];
      expect(words).toHaveLength(lines.length);
      expect(new Set(words).size, `${id} must blank a different word in every line`).toBe(words.length);

      lines.forEach((line, index) => {
        const word = words[index]!;
        expect(blanksIn(line), `${id} line ${index + 1} must have exactly one blank`).toEqual([BLANK]);
        expect(line, `${id} line ${index + 1}: the blank must stand for one whole word`).toMatch(WHOLE_WORD_BLANK);
        expect(word, `${id} line ${index + 1}: the answer must be one Hebrew word`).toMatch(/^[א-ת]+$/u);
        expect(line.replace(BLANK, word), `${id} line ${index + 1} must complete to the canonical theorem verbatim`).toBe(theorem);
        blankedWords.add(word);
      });

      // With a single theorem in every line, the angle-type blank is determined by the
      // other lines of the same task (both theorems differ only in that word).
      expect(lines.some(line => line.includes(angleType)), `${id} must show "${angleType}" in some line`).toBe(true);
    }

    expect([...blankedWords].sort()).toEqual(['מקבילים', 'מתאימות', 'מתחלפות', 'שוות'].sort());
  });

  it('never puts two blanks in the same sentence anywhere in unit 1', () => {
    for (const q of unit1Questions) {
      for (const text of [q.stem, ...(q.subparts ?? []), ...(q.choices ?? [])]) {
        expect(blanksIn(text).length, `${q.id}: "${text}"`).toBeLessThanOrEqual(1);
      }
    }
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
