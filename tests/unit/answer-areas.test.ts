import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import App from '../../src/App';
import plan from '../../src/content/question-plan.json';
import {
  answerSpecById,
  choiceColumns,
  finalSlotsFor,
  FORMAT_ANSWER,
  GROW_BY_MODE,
  growOf,
  LANE_LABEL,
  minimumWritingRows,
  TASK_ANSWER_OVERRIDES,
  TWO_WAYS_LABELS,
  type AnswerMode,
} from '../../src/content/answer-areas';
import { unit1Questions } from '../../src/content/questions-unit1';
import { unit2Questions } from '../../src/content/questions-unit2';
import { unit3Questions } from '../../src/content/questions-unit3';
import { unit4Questions } from '../../src/content/questions-unit4';
import { attrOf, classesOf, elementChildren, findAll, hasClass, parseMarkup, visibleText, type MarkupNode } from './markup-tree';

type PlanTask = { id: string; format: string; requiresJustificationLane?: boolean };
const tasks: PlanTask[] = plan.units.flatMap(unit => unit.tasks as PlanTask[]);

type AnyQuestion = { id: string; stem: string; subparts?: string[]; choices?: string[]; verdictOptions?: string[] };
const questions = new Map<string, AnyQuestion>(
  [...unit1Questions, ...unit2Questions, ...unit3Questions, ...unit4Questions].map(q => [q.id, q as AnyQuestion]),
);

const tree = parseMarkup(renderToStaticMarkup(createElement(App)));
const blocks = new Map<string, MarkupNode>(
  findAll(tree, node => node.tag === 'section' && hasClass(node, 'question-block')).map(node => [attrOf(node, 'data-task-id') ?? '', node]),
);
const blockOf = (id: string) => {
  const block = blocks.get(id);
  if (!block) throw new Error(`No rendered block for ${id}`);
  return block;
};

/** Instructions that require written reasoning (SPEC 8.1 verbs) and therefore real writing rows. */
const ASKS_FOR_WRITING = /נמקו|הסבירו|הוכיחו|ציינו|בשתי דרכים/;

/** Sub-items that carry their own writing rows, checked against the rows the spec promises each. */
const itemsWithRowsIn = (block: MarkupNode, id: string) => {
  const areas = findAll(block, node => hasClass(node, 'answer-lines--item'));
  for (const area of areas) {
    expect(findAll(area, node => hasClass(node, 'rule')).length, id).toBe(answerSpecById(id).itemRows);
  }
  return areas.length;
};

describe('answer areas are decided in data (content/answer-areas.ts)', () => {
  it('maps every format used in question-plan.json, and nothing unused', () => {
    const used = new Set(tasks.map(task => task.format));
    expect([...used].filter(format => !(format in FORMAT_ANSWER))).toEqual([]);
    expect(Object.keys(FORMAT_ANSWER).filter(format => !used.has(format))).toEqual([]);
    for (const task of tasks) expect(() => answerSpecById(task.id)).not.toThrow();
  });

  it('only overrides real tasks', () => {
    const ids = new Set(tasks.map(task => task.id));
    for (const id of Object.keys(TASK_ANSWER_OVERRIDES)) expect(ids.has(id), id).toBe(true);
  });

  it('weights growth deterministically by mode: identification/completion 0, value 1, work/justify 2, algebra/critique/proof 3', () => {
    const expected: Record<AnswerMode, number> = {
      none: 0, items: 0, value: 1, justify: 2, work: 2, 'two-ways': 2, algebra: 3, critique: 3, proof: 3,
    };
    expect(GROW_BY_MODE).toEqual(expected);
  });

  it('gives every instruction to justify, explain, prove, state or solve two ways at least two writing rows or a proof form', () => {
    const short: string[] = [];
    for (const task of tasks) {
      const q = questions.get(task.id)!;
      const text = [q.stem, ...(q.subparts ?? [])].join(' ');
      if (!ASKS_FOR_WRITING.test(text)) continue;
      const spec = answerSpecById(task.id);
      const rows = minimumWritingRows(spec, itemsWithRowsIn(blockOf(task.id), task.id));
      if (spec.mode !== 'proof' && rows < 2) short.push(`${task.id} (${rows})`);
    }
    expect(short).toEqual([]);
    // The tasks that had 0–1 lines before the answer system existed are now covered explicitly.
    for (const id of ['U1-P2-E', 'U2-P1-D', 'U2-P6-C', 'U3-P2-D', 'U4-P2-B', 'U2-P2-D']) {
      expect(minimumWritingRows(answerSpecById(id), itemsWithRowsIn(blockOf(id), id)), id).toBeGreaterThanOrEqual(2);
    }
  });

  it('opens the work area with the theorem lane wherever the plan requires a justification lane — plural exactly when the key cites two reasons', () => {
    const keyReasons = (id: string) => {
      const justification = (questions.get(id) as { expected?: { justification?: string | string[] } } | undefined)?.expected?.justification;
      return justification == null ? 0 : Array.isArray(justification) ? justification.length : 1;
    };
    for (const task of tasks.filter(t => t.requiresJustificationLane)) {
      const lane = keyReasons(task.id) >= 2 ? 'theorems' : 'theorem';
      expect(answerSpecById(task.id).lane, task.id).toBe(lane);
      const area = findAll(blockOf(task.id), node => hasClass(node, 'answer-lines'))[0]!;
      const first = elementChildren(area)[0]!;
      expect(classesOf(first), task.id).toEqual(expect.arrayContaining(['rule', 'rule--lane', 'justification-lane']));
      expect(visibleText(first).trim(), task.id).toBe(LANE_LABEL[lane]);
    }
    // A singular label never promises one reason where the key needs two (and vice versa).
    expect(LANE_LABEL.theorem).toBe('המשפט המתאים:');
    expect(LANE_LABEL.theorems).toBe('המשפטים המתאימים:');
  });

  it('labels the two lanes of a two-ways task with words — never letters or numbers (SPEC 4.2)', () => {
    for (const label of TWO_WAYS_LABELS) {
      expect(label).toMatch(/^[א-ת]+(?: [א-ת]+)+$/u);
      expect(label).not.toMatch(/[0-9A-Za-z]|^[א-ת]$/u);
    }
    const lanes = findAll(blockOf('U2-P2-D'), node => hasClass(node, 'answer-way'));
    expect(lanes.map(lane => visibleText(findAll(lane, node => hasClass(node, 'answer-way-label'))[0]!).trim())).toEqual([...TWO_WAYS_LABELS]);
  });

  it('names each final-answer slot by an unknown the stem asks for, with a blank and never a value', () => {
    for (const task of tasks) {
      const spec = answerSpecById(task.id);
      const slots = finalSlotsFor(task.id);
      if (!spec.final) {
        expect(slots, task.id).toEqual([]);
        continue;
      }
      expect(slots.length, task.id).toBeGreaterThan(0);
      const stem = questions.get(task.id)!.stem;
      for (const slot of slots) {
        expect(slot, task.id).toMatch(/_{4}/);
        expect(slot, `${task.id}: a slot must not reveal a number`).not.toMatch(/\d/);
        const unknown = slot.replace(/:?\s*=?\s*_{4}°?$/, '').replace(/^גודל ה/, '');
        expect(stem, `${task.id}: slot "${slot}" names something the stem does not`).toContain(unknown);
      }
    }
  });

  it('renders the work area exactly as the spec says: grow weight, minimum rows, and no stray lines', () => {
    for (const task of tasks) {
      const spec = answerSpecById(task.id);
      const block = blockOf(task.id);
      expect(attrOf(block, 'data-grow'), task.id).toBe(String(growOf(spec)));
      expect(attrOf(block, 'data-answer-mode'), task.id).toBe(spec.mode);
      const areas = findAll(block, node => hasClass(node, 'answer-lines') && !hasClass(node, 'answer-lines--item'));
      if (spec.mode === 'none' || spec.mode === 'items') {
        expect(areas, `${task.id} must not carry stray writing lines`).toHaveLength(0);
        continue;
      }
      const expectedAreas = spec.mode === 'two-ways' ? TWO_WAYS_LABELS.length : 1;
      expect(areas, task.id).toHaveLength(expectedAreas);
      for (const area of areas) {
        const min = Number(/--answer-min-lines:\s*(\d+)/.exec(attrOf(area, 'style') ?? '')?.[1]);
        const expectedMin = spec.minLines + (spec.lane || spec.mode === 'proof' ? 1 : 0);
        expect(min, task.id).toBe(expectedMin);
      }
    }
    // The multiple-choice reason and the completed proof tables have no writing lines under them.
    for (const id of ['U3-P1-A', 'U3-P2-B', 'U3-P2-C', 'U1-P3-C', 'U2-P1-C']) {
      expect(findAll(blockOf(id), node => hasClass(node, 'answer-lines')), id).toHaveLength(0);
    }
  });
});

describe('places to write that match each instruction', () => {
  const subpartsOf = (id: string) => findAll(blockOf(id), node => hasClass(node, 'subpart'));
  const bubblesIn = (node: MarkupNode) => findAll(node, child => hasClass(child, 'choice'));

  it('U4-P1-C: a verdict (משפט ישיר / משפט הפוך) beside every statement', () => {
    const items = subpartsOf('U4-P1-C');
    expect(items).toHaveLength(4);
    for (const item of items) {
      const aside = findAll(item, node => hasClass(node, 'subpart-aside'))[0];
      expect(aside).toBeDefined();
      expect(bubblesIn(aside!).map(choice => visibleText(choice).trim())).toEqual(['משפט ישיר', 'משפט הפוך']);
    }
    expect(visibleText(blockOf('U4-P1-C'))).not.toContain('סוג המשפט');
  });

  it('U1-P2-E: three real sub-items, each with נכון / לא נכון beside it and נימוק rows under it', () => {
    const items = subpartsOf('U1-P2-E');
    expect(items).toHaveLength(3);
    for (const item of items) {
      expect(findAll(item, node => hasClass(node, 'subpart-marker'))).toHaveLength(1);
      expect(bubblesIn(item).map(choice => visibleText(choice).trim())).toEqual(['נכון', 'לא נכון']);
      const rows = findAll(item, node => hasClass(node, 'answer-lines--item'));
      expect(rows).toHaveLength(1);
      expect(visibleText(rows[0]!).trim()).toBe('נימוק:');
      expect(findAll(rows[0]!, node => hasClass(node, 'rule')).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('U3-P1-C: a reason slot on every claim line, and a reason bank without answer bubbles', () => {
    const block = blockOf('U3-P1-C');
    const items = subpartsOf('U3-P1-C');
    expect(items).toHaveLength(3);
    for (const item of items) expect(findAll(item, node => hasClass(node, 'cloze-blank'))).toHaveLength(1);
    const bank = findAll(block, node => hasClass(node, 'word-bank'));
    expect(bank).toHaveLength(1);
    expect(findAll(bank[0]!, node => hasClass(node, 'word-bank-item'))).toHaveLength(3);
    expect(bubblesIn(block)).toHaveLength(0);
  });

  it('U3-P2-B: an order column (סדר) with an empty cell for every proof row', () => {
    const table = findAll(blockOf('U3-P2-B'), node => node.tag === 'table')[0]!;
    const headings = findAll(table, node => node.tag === 'th').map(th => visibleText(th).trim());
    expect(headings[0]).toBe('סדר');
    const rows = findAll(table, node => node.tag === 'tr').slice(1);
    expect(rows).toHaveLength(4);
    for (const row of rows) expect(hasClass(elementChildren(row)[0]!, 'write-cell')).toBe(true);
  });

  it('U2-P2-D: two labelled work lanes', () => {
    expect(findAll(blockOf('U2-P2-D'), node => hasClass(node, 'answer-way'))).toHaveLength(2);
  });

  it('U1-P1-D: a word bank without bubbles and a blank beside each of the three pairs', () => {
    const block = blockOf('U1-P1-D');
    expect(bubblesIn(block)).toHaveLength(0);
    expect(findAll(block, node => hasClass(node, 'word-bank-item'))).toHaveLength(3);
    const items = subpartsOf('U1-P1-D');
    expect(items).toHaveLength(3);
    for (const item of items) expect(findAll(item, node => hasClass(node, 'cloze-blank'))).toHaveLength(1);
  });

  it('never shows typed underscores to the student in units 1–4: every blank is a slot', () => {
    for (const [id, block] of blocks) expect(visibleText(block), id).not.toMatch(/_{2,}/);
  });
});

describe('answer options', () => {
  const choices = findAll(tree, node => hasClass(node, 'choice'));

  it('wrap every option in exactly ONE content element, so text and math flow in reading order', () => {
    expect(choices.length).toBeGreaterThan(20);
    for (const choice of choices) {
      const kids = elementChildren(choice);
      expect(kids).toHaveLength(1);
      expect(hasClass(kids[0]!, 'choice-text')).toBe(true);
      expect(choice.children.filter(child => typeof child === 'string' && child.trim() !== '')).toEqual([]);
    }
  });

  it('choose one or two columns from the options in data', () => {
    expect(choiceColumns(['47°', '43°', '90°', '133°'])).toBe(2);
    expect(choiceColumns(['זוויות מתאימות בין ישרים מקבילים שוות זו לזו.', 'x'])).toBe(1);
    for (const grid of findAll(tree, node => hasClass(node, 'choice-grid'))) {
      expect(['1', '2']).toContain(attrOf(grid, 'data-cols'));
    }
  });
});
