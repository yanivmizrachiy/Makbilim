import { describe, expect, it } from 'vitest';
import { teacherAnswerKey } from '../../src/content/answer-key';
import { unit3Questions } from '../../src/content/questions-unit3';
import { REASONS, THEOREMS } from '../../src/content/theorems';

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

  /** Every string of a unit-3 task: what the student reads, the key, and the teacher note. */
  const allText = (q: (typeof unit3Questions)[number]) => [
    q.stem,
    ...(q.subparts ?? []),
    ...(q.choices ?? []),
    ...(q.proofLines ?? []).flatMap(row => [row.claim, row.reason ?? '']),
    ...Object.values(q.expected).flatMap(value => (Array.isArray(value) ? value : [value])),
    q.teacherNote ?? '',
  ];

  it('quotes the direct theorems exactly as theorems.ts has them — never a retyped „…שוות זו לזו”', () => {
    for (const q of unit3Questions) {
      for (const text of allText(q)) {
        expect(text, q.id).not.toMatch(/בין (ה)?ישרים (ה)?מקבילים שוות זו לזו/);
        if (text.includes('בין ישרים מקבילים שוות')) {
          expect([THEOREMS.correspondingDirect.text, THEOREMS.alternateDirect.text].some(t => text.includes(t)), `${q.id}: ${text}`).toBe(true);
        }
      }
    }
  });

  it('takes every proof-table reason from THEOREMS / REASONS', () => {
    const canonical: string[] = [THEOREMS.correspondingDirect.text, THEOREMS.alternateDirect.text, ...Object.values(REASONS)];
    for (const q of unit3Questions) {
      for (const row of q.proofLines ?? []) {
        if (row.reason === undefined || row.reason.includes('___')) continue;
        expect(canonical, `${q.id}: ${row.reason}`).toContain(row.reason);
      }
    }
  });

  it('states the parallel condition in words wherever a task relies on a direct theorem', () => {
    for (const q of unit3Questions.filter(item => item.diagram.parallelGivens.length > 0)) {
      const given = q.diagram.parallelGivens[0]!;
      const stated = q.stem.includes(given) || (q.proofLines ?? []).some(row => row.claim === given && row.reason === REASONS.given);
      expect(stated, q.id).toBe(true);
    }
  });

  it('U3-P2-B: the rows are printed in an invalid order and the key lists every accepted filling of the order column', () => {
    const q = unit3Questions.find(item => item.id === 'U3-P2-B')!;
    const printed = (q.proofLines ?? []).map(row => row.claim);
    const keyed = (q.expected.proof ?? []).map(line => line.split(' — ')[0]);
    expect(printed).not.toEqual(keyed);
    expect(printed[0]).toBe('∠A = ∠C');
    expect(printed.indexOf('∠A = ∠B')).toBeLessThan(printed.indexOf('p ∥ q'));
    for (const order of q.acceptedOrders ?? []) expect([...order].sort()).toEqual([1, 2, 3, 4]);
    expect(q.acceptedOrders).toHaveLength(3);
  });

  it('U3-P2-D: asks for a datum without implying earlier ones, and draws only the angles it names', () => {
    const q = unit3Questions.find(item => item.id === 'U3-P2-D')!;
    expect(q.stem).not.toContain('הנוספים');
    expect(q.diagram.pointLabels).toEqual(['A', 'B']);
    expect(q.choices).toContain(q.expected.choice);
  });

  it('carries the teacher notes into the printed answer key', () => {
    for (const q of unit3Questions) {
      const entry = teacherAnswerKey.find(item => item.id === q.id)!;
      expect(entry.note, q.id).toBe(q.teacherNote);
    }
  });
});
