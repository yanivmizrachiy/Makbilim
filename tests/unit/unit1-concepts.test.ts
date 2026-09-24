import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PARALLEL_ARROWS_CONVENTION, unit1Questions } from '../../src/content/questions-unit1';
import { teacherAnswerKey } from '../../src/content/answer-key';
import { THEOREMS } from '../../src/content/theorems';
import { Unit1Page1 } from '../../src/App';
import { UNIT1_BOTTOM_LABELS, Unit1Continuation, unit1RelationTableCases } from '../../src/pages/Unit1Continuation';
import { alternateInteriorPairs, alternatePairs, correspondingPair } from '../../src/geometry/relations';

// The marked angles actually drawn for a task, read from the rendered page.
const unit1Markup = renderToStaticMarkup(createElement(Unit1Continuation));
function markedAnglesOf(taskId: string) {
  const start = unit1Markup.indexOf(`data-task-id="${taskId}"`);
  const end = unit1Markup.indexOf('<section', start + 1);
  const section = unit1Markup.slice(start, end === -1 ? undefined : end);
  return [...section.matchAll(/data-angle-role="marked" data-angle-at="(top|bottom)" data-angle-sector="([0-3])"/g)]
    .map(match => ({ at: match[1], sector: Number(match[2]) }));
}

const BLANK = '______';
const blanksIn = (text: string) => text.match(/_+/g) ?? [];
const WHOLE_WORD_BLANK = /(?:^|\s)______(?=[\s.,]|$)/;

describe('Unit 1 conceptual integrity', () => {
  it('contains 18 progressively structured questions', () => {
    expect(unit1Questions).toHaveLength(18);
    expect(new Set(unit1Questions.map(q => q.id)).size).toBe(18);
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

  it('drills both canonical direct theorems one missing word per line, the angle type decided only by the drawing (SPEC 3.1)', () => {
    expect(THEOREMS.correspondingDirect.text).toBe('זוויות מתאימות בין ישרים מקבילים שוות.');
    expect(THEOREMS.alternateDirect.text).toBe('זוויות מתחלפות בין ישרים מקבילים שוות.');
    const canonical = [THEOREMS.correspondingDirect.text, THEOREMS.alternateDirect.text];
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
      expect(q.stem, `${id} must point the student to the marked pair in the drawing`).toContain('המסומן');
      expect(q.stem, `${id}: the instruction ties the first line to the marked pair`).toContain('בשורה הראשונה');
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
        expect(canonical, `${id} line ${index + 1} must complete to a canonical theorem verbatim`).toContain(line.replace(BLANK, word));
        blankedWords.add(word);
      });

      // Line 1 blanks the angle type and completes to the theorem of the MARKED pair.
      expect(lines[0], `${id}: line 1 blanks the angle type`).toBe(theorem.replace(angleType, BLANK));
      expect(words[0]).toBe(angleType);
      // The other lines use BOTH type words, so the angle type cannot be copied from them.
      const rest = lines.slice(1).join(' ');
      expect(rest, `${id}: the other lines name corresponding angles`).toContain('מתאימות');
      expect(rest, `${id}: the other lines name alternate angles`).toContain('מתחלפות');

      // Both direct theorems are true, so the angle-type blank is determined by the DRAWING:
      // exactly one marked pair, of exactly that relation.
      const marked = markedAnglesOf(id);
      const top = marked.filter(angle => angle.at === 'top');
      const bottom = marked.filter(angle => angle.at === 'bottom');
      expect(top, `${id} marks exactly one angle at the top intersection`).toHaveLength(1);
      expect(bottom, `${id} marks exactly one angle at the bottom intersection`).toHaveLength(1);
      const drawn = [top[0]!.sector, bottom[0]!.sector];
      const pairsOfType = angleType === 'מתאימות'
        ? ([0, 1, 2, 3] as const).map(seed => correspondingPair(seed))
        : alternatePairs();
      expect(pairsOfType.some(([a, b]) => a.sector === drawn[0] && b.sector === drawn[1]), `${id}: the marked pair must be ${angleType}`).toBe(true);

      // The key says which theorem each line completes to, and that line 1 comes from the drawing.
      const note = teacherAnswerKey.find(entry => entry.id === id)?.note ?? '';
      expect(note).toContain(THEOREMS.correspondingDirect.text);
      expect(note).toContain(THEOREMS.alternateDirect.text);
      expect(note).toContain('הזוג המסומן');
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

  it('explicitly challenges the misconception that alternate angles are always equal, on both drawings', () => {
    const q = unit1Questions.find(item => item.id === 'U1-P3-A')!;
    // SPEC 3.1: one student says the incomplete wording, the other corrects it with the canonical sentence.
    expect(q.stem).toContain('זוויות מתחלפות שוות');
    expect(q.stem).toContain(THEOREMS.alternateDirect.text);
    // The two drawings are part of the task: the student decides in which one equality follows.
    expect(q.stem).toContain('אינם מקבילים');
    expect(q.stem).toMatch(/באיזה שרטוט/);
    // Not the same statement U1-P2-E just judged: Daniel's claim is about the drawings.
    const trueFalse = unit1Questions.find(item => item.id === 'U1-P2-E')!;
    expect(q.stem).not.toContain(`„${trueFalse.subparts![0]!}”`);
    const key = teacherAnswerKey.find(entry => entry.id === 'U1-P3-A')!.answer as string;
    expect(key).toContain('נועה צודקת');
    expect(key).toContain(THEOREMS.alternateDirect.text);
    expect(key).toContain('בשרטוט השני');
  });

  it('takes every theorem sentence from theorems.ts: no retyped variant anywhere in unit 1 (D1)', () => {
    const canonical = [THEOREMS.correspondingDirect.text, THEOREMS.alternateDirect.text];
    const unit1Keys = teacherAnswerKey.filter(entry => entry.unit === 1);
    const texts = [
      ...unit1Questions.flatMap(q => [q.stem, ...(q.subparts ?? []), ...(q.choices ?? [])]),
      ...unit1Keys.flatMap(entry => [...(Array.isArray(entry.answer) ? entry.answer : [entry.answer]).map(String), entry.note ?? '']),
    ];
    for (const text of texts) {
      expect(text, `retyped theorem variant: "${text}"`).not.toMatch(/בין (ה)?ישרים (ה)?מקבילים שוות זו לזו/);
      if (text.includes('בין ישרים מקבילים שוות') && !text.includes(BLANK)) {
        expect(canonical.some(sentence => text.includes(sentence)), `not the canonical sentence: "${text}"`).toBe(true);
      }
    }
    // U1-P3-D: the key's exact sentence is the canonical one; the formal if–then form is only accepted.
    const correction = unit1Keys.find(entry => entry.id === 'U1-P3-D')!;
    expect((correction.answer as string[]).join(' ')).toContain(THEOREMS.correspondingDirect.text);
    expect((correction.answer as string[]).join(' ')).toContain('חסר התנאי שהישרים מקבילים');
    expect(correction.note).toContain(THEOREMS.correspondingDirect.formalText);
  });

  it('states the parallel-arrow convention in words where the arrows first appear and where the answer depends on them (D3)', () => {
    const page1 = renderToStaticMarkup(createElement(Unit1Page1));
    const markup = page1 + unit1Markup;
    const sections = markup.split('<section').slice(1);
    const firstWithArrows = sections.find(section => section.includes('parallel-mark--chevrons'));
    expect(/data-task-id="([^"]+)"/.exec(firstWithArrows ?? '')?.[1]).toBe('U1-P2-C');
    expect(PARALLEL_ARROWS_CONVENTION).toMatch(/חצים.*מקבילים/);
    const plain = markup.replace(/<[^>]+>/g, ' ');
    // The convention is shown as an explanation NOTE (hint-note), set apart from the instruction.
    expect(markup).toContain('hint-note');
    expect(plain).toContain('חצים זהים על שני ישרים מסמנים שהישרים מקבילים');
    for (const id of ['U1-P2-C', 'U1-P5-C']) {
      expect(unit1Questions.find(q => q.id === id)!.stem, id).not.toContain(PARALLEL_ARROWS_CONVENTION);
    }
    // U1-P3-B: lines without arrows are NOT given parallel — stated in the note, not the instruction (SPEC 10.5).
    expect(plain).toContain('לא נתון שהישרים מקבילים');
  });

  it('scrambles the bottom crossing\'s numbers so that no matched pair lies on one printed row', () => {
    for (const [id, labels] of Object.entries(UNIT1_BOTTOM_LABELS)) {
      expect([...labels].sort(), id).toEqual(['5', '6', '7', '8']);
      expect(labels, `${id}: bottom numbers must not repeat the top order`).not.toEqual(['5', '6', '7', '8']);
    }
    for (const id of ['U1-P1-E', 'U1-P2-A']) {
      const pairs = teacherAnswerKey.find(entry => entry.id === id)!.answer as string[];
      for (const pair of pairs) {
        const [, a, b] = /∠(\d) ↔ ∠(\d)/.exec(pair)!;
        expect(Number(b) - Number(a), `${id}: ${pair} lies straight across the columns`).not.toBe(4);
      }
    }
  });

  it('starts alternate-angle identification from an angle between the lines (easy before hard)', () => {
    const page1 = renderToStaticMarkup(createElement(Unit1Page1));
    const start = page1.indexOf('data-task-id="U1-P1-C"');
    const section = page1.slice(start, page1.indexOf('<section', start + 1));
    const [mark] = [...section.matchAll(/data-angle-at="(top|bottom)" data-angle-sector="([0-3])"/g)];
    expect(mark?.[1]).toBe('top');
    // The interior alternate pairs of this drawing (between the two lines).
    expect(alternateInteriorPairs(-7, 101).some(([a]) => a.intersection === 'top' && a.sector === Number(mark?.[2]))).toBe(true);
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
