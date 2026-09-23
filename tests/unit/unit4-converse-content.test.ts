import { describe, expect, it } from 'vitest';
import { unit4Questions } from '../../src/content/questions-unit4';
import { THEOREMS } from '../../src/content/theorems';

const BLANK = '______';
const blanksIn = (text: string) => text.match(/_+/g) ?? [];
const WHOLE_WORD_BLANK = /(?:^|\s)______(?=[\s.,]|$)/;

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

  it('introduces converse theorem completion before algebra, one missing word per line of the canonical wording', () => {
    const algebraIndex = unit4Questions.findIndex(q => /(?:^|[^A-Za-z])x(?:[^A-Za-z]|$)/.test(q.stem));
    expect(algebraIndex).toBeGreaterThan(3);

    expect(THEOREMS.correspondingConverse.text).toBe('אם שני ישרים נחתכים על ידי ישר שלישי, וזוג זוויות מתאימות שוות זו לזו, אז שני הישרים מקבילים.');
    expect(THEOREMS.alternateConverse.text).toBe('אם שני ישרים נחתכים על ידי ישר שלישי, וזוג זוויות מתחלפות שוות זו לזו, אז שני הישרים מקבילים.');
    const drills = [
      { id: 'U4-P1-A', theorem: THEOREMS.correspondingConverse.text, angleType: 'מתאימות' },
      { id: 'U4-P1-B', theorem: THEOREMS.alternateConverse.text, angleType: 'מתחלפות' },
    ];
    expect(unit4Questions.slice(0, 2).map(q => q.id)).toEqual(drills.map(d => d.id));

    for (const { id, theorem, angleType } of drills) {
      const q = unit4Questions.find(item => item.id === id)!;
      const lines = q.subparts ?? [];
      const words = q.expected.completions ?? [];

      expect(q.stem).toMatch(/^השלימו/);
      expect(q.stem, `${id} must tell the student that every line is the same converse theorem`).toContain('אותו משפט הפוך');
      expect(blanksIn(q.stem), `${id} stem must not contain a blank`).toHaveLength(0);
      expect(lines.length, `${id} needs at least three completion lines`).toBeGreaterThanOrEqual(3);
      expect(new Set(lines).size, `${id} repeats an identical line`).toBe(lines.length);
      expect(words).toHaveLength(lines.length);
      expect(new Set(words).size, `${id} must blank a different word in every line`).toBe(words.length);

      lines.forEach((line, index) => {
        const word = words[index]!;
        expect(blanksIn(line), `${id} line ${index + 1} must have exactly one blank`).toEqual([BLANK]);
        expect(line, `${id} line ${index + 1}: the blank must stand for one whole word`).toMatch(WHOLE_WORD_BLANK);
        expect(word, `${id} line ${index + 1}: the answer must be one Hebrew word`).toMatch(/^[א-ת]+$/u);
        expect(line.replace(BLANK, word), `${id} line ${index + 1} must complete to the canonical converse verbatim`).toBe(theorem);
      });

      // The premise word, the parallel conclusion and the angle type are all practised.
      expect(words).toEqual(expect.arrayContaining([angleType, 'שוות', 'מקבילים']));
      expect(lines.some(line => line.includes(angleType)), `${id} must show "${angleType}" in some line`).toBe(true);
    }
  });

  it('never puts two blanks in the same sentence anywhere in the converse unit', () => {
    for (const q of unit4Questions) {
      for (const text of [q.stem, ...(q.subparts ?? []), ...(q.choices ?? [])]) {
        expect(blanksIn(text).length, `${q.id}: "${text}"`).toBeLessThanOrEqual(1);
      }
    }
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
