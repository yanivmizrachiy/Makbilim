import { describe, expect, it } from 'vitest';
import { unit4Questions } from '../../src/content/questions-unit4';
import { REASONS, THEOREMS } from '../../src/content/theorems';
import { answerSpecById } from '../../src/content/answer-areas';
import plan from '../../src/content/question-plan.json';

type PlannedTask = { id: string; format: string; instructionVerb: string; progressionGain: string };
const planOf = (id: string) => (plan.units as Array<{ tasks: PlannedTask[] }>).flatMap(unit => unit.tasks).find(task => task.id === id)!;
const byId = (id: string) => unit4Questions.find(q => q.id === id)!;
const asList = (value: string | string[] | undefined) => (value == null ? [] : Array.isArray(value) ? value : [value]);
/** Every string a unit-4 task shows the student or the teacher. */
const allStrings = (q: (typeof unit4Questions)[number]) => [
  q.stem, ...(q.subparts ?? []), ...(q.choices ?? []), ...(q.verdictOptions ?? []),
  ...asList(q.expected.reason), ...asList(q.expected.justification), ...(q.expected.proof ?? []),
  ...(q.expected.completions ?? []), q.expected.choice ?? '', q.expected.conclusion ?? '',
];

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

  it('ends with a combined direct-and-converse proof whose reasons are the canonical sentences', () => {
    const final = unit4Questions.at(-1);
    expect(final?.id).toBe('U4-P2-D');
    const proof = final?.expected.proof ?? [];
    // The direct theorem where p ∥ q is GIVEN, the converse where q ∥ r is CONCLUDED — each the
    // canonical sentence from theorems.ts, never a retyped variant (decision D1).
    // …and the direct-theorem line says where the given parallelism enters (p ∥ q, from the stem).
    expect(proof.filter(line => line.includes(THEOREMS.correspondingDirect.text))).toEqual([`∠A = ∠B — ${THEOREMS.correspondingDirect.text} (p ∥ q נתון)`]);
    expect(proof.at(-1)).toBe(`q ∥ r — ${THEOREMS.correspondingConverse.text}`);
    expect(proof.findIndex(line => line.includes(THEOREMS.correspondingDirect.text)))
      .toBeLessThan(proof.findIndex(line => line.includes(THEOREMS.correspondingConverse.text)));
    expect(proof).toContain(`∠B = ∠C — ${REASONS.transitivity}`);
    expect(proof.filter(line => line.endsWith(`— ${REASONS.given}`)).length).toBeGreaterThanOrEqual(2);
    expect(answerSpecById('U4-P2-D').minLines, 'one proof-form row per key line').toBeGreaterThanOrEqual(proof.length);
  });

  it('keeps every theorem wording canonical: no retyped direct theorem, converses only from theorems.ts', () => {
    const converses = [THEOREMS.correspondingConverse.text, THEOREMS.alternateConverse.text];
    for (const q of unit4Questions) {
      for (const text of allStrings(q)) {
        expect(text, `${q.id}: retyped direct theorem`).not.toMatch(/בין (ה)?ישרים (ה)?מקבילים שוות זו לזו/);
        if (/בין ישרים מקבילים שוות/.test(text)) {
          expect([THEOREMS.correspondingDirect.text, THEOREMS.alternateDirect.text].some(t => text.includes(t)), `${q.id}: "${text}"`).toBe(true);
        }
        // A key sentence that states a converse ('אם … אז שני הישרים מקבילים') is one of the two canonical ones.
        if (/^(?:נכון — |q ∥ r — )?אם שני ישרים נחתכים/.test(text) && !text.includes('______')) {
          expect(converses.some(c => text.endsWith(c)), `${q.id}: "${text}"`).toBe(true);
        }
      }
    }
  });

  it('U4-P2-A: the stem does not name the pair type — the student identifies it and chooses the converse', () => {
    const q = byId('U4-P2-A');
    const [givens, question] = q.stem.split(/(?=ציינו)/);
    expect(question, 'the stem asks the student to identify the pair').toBeDefined();
    expect(givens).not.toMatch(/מתאימ|מתחלפ/);
    expect(question).toContain('מתאימות או מתחלפות');
    expect(q.diagram?.givens.join(' ')).not.toMatch(/alternate|corresponding/);
    expect(asList(q.expected.reason)).toEqual(['∠C ו־∠D הן זוויות מתחלפות.', THEOREMS.alternateConverse.text]);
    expect(planOf('U4-P2-A').instructionVerb).toContain('ציינו');
    // Three things to write (the pair type, k ∥ m, the full converse): at least three rows.
    expect(answerSpecById('U4-P2-A').minLines).toBeGreaterThanOrEqual(3);
    expect(answerSpecById('U4-P2-A').minLines).toBeGreaterThan(answerSpecById('U4-P1-D').minLines);
    // It is no longer the same path as the guided U4-P1-D, which names the type.
    expect(byId('U4-P1-D').stem).toContain('מתאימות');
    expect(planOf('U4-P2-A').progressionGain).not.toBe(planOf('U4-P1-D').progressionGain);
  });

  it('U4-P2-B: true / false on the converse theorems (SPEC 4, unit 4), each verdict with a reason row', () => {
    const q = byId('U4-P2-B');
    expect(planOf('U4-P2-B').format).toBe('true-false');
    expect(planOf('U4-P2-B').instructionVerb).toBe('קבעו ונמקו');
    // One line: the instruction names the verdict; the two options (נכון / לא נכון) sit beside each claim.
    expect(q.stem).toMatch(/קבעו אם כל טענה נכונה/);
    expect(q.stem).toMatch(/^הישר t חותך את p ו־q\./);
    expect(q.stem).toMatch(/נמקו/);
    expect(q.verdictOptions).toEqual(['נכון', 'לא נכון']);
    expect(q.choices).toBeUndefined();
    const claims = q.subparts ?? [];
    const keys = asList(q.expected.reason);
    expect(claims.length).toBeGreaterThanOrEqual(4);
    expect(keys).toHaveLength(claims.length);
    // Every claim names the lines it is about and concludes p ∥ q — nothing is recognisable by wording alone.
    for (const claim of claims) {
      expect(claim).toMatch(/^אם /);
      expect(claim).toMatch(/, אז p ו־q מקבילים\.$/);
      expect(claim.split(', אז ')[0], 'the premise names its lines').toMatch(/[pq] ו־[qt]/);
    }
    expect(new Set(claims).size).toBe(claims.length);
    const verdicts = keys.map(key => /^(נכון|לא נכון) — /.exec(key)?.[1]);
    expect(verdicts.every(Boolean), 'every key line starts with its verdict').toBe(true);
    expect(verdicts.filter(v => v === 'נכון').length).toBeGreaterThanOrEqual(2);
    expect(verdicts.filter(v => v === 'לא נכון').length).toBeGreaterThanOrEqual(2);
    // The unit's core misconception — position without equality — is one of the false claims.
    const positionOnly = claims.findIndex(claim => /הן זוויות מתחלפות/.test(claim) && !/שוות/.test(claim));
    expect(positionOnly).toBeGreaterThanOrEqual(0);
    expect(verdicts[positionOnly]).toBe('לא נכון');
    // The reason rows are on the page: one per claim at least.
    expect(answerSpecById('U4-P2-B').mode).toBe('items');
    expect(answerSpecById('U4-P2-B').itemRows ?? 0).toBeGreaterThanOrEqual(1);
  });

  it('U4-P2-C: the key names the corresponding converse in the theorem lane and asks only for x', () => {
    const q = byId('U4-P2-C');
    expect(q.expected.justification).toBe(THEOREMS.correspondingConverse.text);
    expect(Object.keys(q.expected.values ?? {})).toEqual(['x']);
    expect(asList(q.expected.reason).join(' ')).toContain('המשפט ההפוך של הזוויות המתאימות');
    // The lane holds the theorem; the equation, its solution and the check need rows of their own.
    expect(answerSpecById('U4-P2-C').lane).toBe('theorem');
    expect(answerSpecById('U4-P2-C').minLines).toBeGreaterThanOrEqual(asList(q.expected.reason).length);
  });
});
