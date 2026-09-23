import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import App from '../../src/App';
import TeacherApp, { answerFlow, COLUMN_FLOW_MAX_LINE } from '../../src/TeacherApp';
import { segmentMathText } from '../../src/components/MathText';
import { globalPageNumber, globalQuestionNumber } from '../../src/content/booklet';
import { teacherAnswerKey } from '../../src/content/answer-key';
import { TASK_KIND_LABEL, taskKindById } from '../../src/content/task-kinds';
import { describeLocation, locateTask, stemOpening, STEM_OPENING_WORDS } from '../../src/content/teacher-locator';

/**
 * The teacher guide as a printed answer key for the CONTINUOUSLY-NUMBERED student booklet (SPEC
 * 4.2/11.5/11.11): every answer is located by the question's global number and its global page
 * number, and quotes the opening words of the stem without breaking a math run. The ● position
 * model is retired; no "יחידה N" reaches the teacher.
 */

const root = process.cwd();
const studentHtml = renderToStaticMarkup(createElement(App));
const teacherHtml = renderToStaticMarkup(createElement(TeacherApp));

const decode = (value: string) =>
  value
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'").replace(/&amp;/g, '&');

type RenderedStudentPage = { pageId: string; globalPage: number; taskIds: string[]; markers: number };

/** The authored student pages as rendered (curriculum loads async and is absent in SSR): per A4 page, the task ids of its ● (now numbered) questions in document order. */
function renderedStudentPages(): RenderedStudentPage[] {
  const pages: RenderedStudentPage[] = [];
  const token = /<article class="a4-page[^"]*" data-page-id="([^"]+)" data-page="(\d+)"|data-task-id="([^"]+)"|class="question-marker"/g;
  for (const match of studentHtml.matchAll(token)) {
    if (match[1]) {
      pages.push({ pageId: match[1], globalPage: Number(match[2]), taskIds: [], markers: 0 });
      continue;
    }
    const current = pages[pages.length - 1];
    if (!current) throw new Error('question outside an A4 page');
    if (match[3]) current.taskIds.push(match[3]);
    else current.markers += 1;
  }
  return pages;
}

/** The rendered teacher answers, in document order. */
function renderedAnswers() {
  const articles = [...teacherHtml.matchAll(/<article class="teacher-answer-card" data-task-id="([^"]+)" data-question-number="(\d+)">([\s\S]*?)<\/article>/g)];
  return articles.map(match => ({ id: match[1]!, questionNumber: Number(match[2]), html: match[3]! }));
}

const visibleText = (html: string) =>
  decode(html.replace(/<span aria-label="([^"]*)">[\s\S]*?<\/span>/g, ' $1 ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

describe('teacher guide — locating an answer by its global number', () => {
  const pages = renderedStudentPages();

  it('renders all 15 authored student pages and their 58 questions', () => {
    expect(pages).toHaveLength(15);
    expect(pages.flatMap(page => page.taskIds)).toHaveLength(58);
  });

  it('numbers every ● slot on each page and gives each task its global question and page number', () => {
    for (const page of pages) {
      expect(page.markers, page.pageId).toBe(page.taskIds.length);
      expect(page.globalPage).toBe(globalPageNumber(page.pageId));
      for (const id of page.taskIds) {
        const location = locateTask(id);
        expect(location.questionNumber).toBe(globalQuestionNumber(id));
        expect(location.pageNumber).toBe(page.globalPage);
      }
    }
  });

  it('prints the answers in booklet order (curriculum first pushes authored numbers to 9..66)', () => {
    const answers = renderedAnswers();
    expect(answers).toHaveLength(58);
    const booklet = pages.flatMap(page => page.taskIds);
    expect(answers.map(answer => answer.id)).toEqual(booklet);
    expect(answers.map(answer => answer.questionNumber)).toEqual(booklet.map(globalQuestionNumber));
    // Authored questions start at 9 because the 8 curriculum blocks are questions 1..8.
    expect(answers[0]!.questionNumber).toBe(9);
    expect(answers.at(-1)!.questionNumber).toBe(66);
  });

  it('heads every answer with its global number, task-type label, and page', () => {
    for (const answer of renderedAnswers()) {
      const location = locateTask(answer.id);
      expect(answer.questionNumber).toBe(location.questionNumber);
      expect(answer.html).toContain(`<span class="teacher-answer-position-number">${location.questionNumber}</span>`);
      expect(answer.html).toContain(`<span class="teacher-answer-kind">${TASK_KIND_LABEL[taskKindById(answer.id)]}</span>`);
      expect(visibleText(answer.html)).toContain(`עמוד ${location.pageNumber}`);
      expect(answer.html).toContain(`title="${describeLocation(location)}"`);
      expect(describeLocation(location)).toMatch(/^שאלה \d+ · עמוד \d+$/);
    }
  });

  it('never prints "יחידה" anywhere in the guide', () => {
    expect(visibleText(teacherHtml)).not.toContain('יחידה');
  });

  it('heads every page group with the page number, its topic and its question range', () => {
    for (const page of pages) {
      const heading = new RegExp(`<h3 id="teacher-p${page.globalPage}">[\\s\\S]*?</header>`).exec(teacherHtml)?.[0];
      expect(heading, page.pageId).toBeDefined();
      expect(visibleText(heading!)).toContain(`עמוד ${page.globalPage}`);
      const numbers = page.taskIds.map(globalQuestionNumber);
      expect(visibleText(heading!)).toContain(`${numbers[0]}–${numbers[numbers.length - 1]}`);
    }
  });
});

describe('teacher guide — stem openings', () => {
  const openingText = (opening: string) => opening.replace(/…”?$/, '');

  it('quotes the start of the real stem, cut between words, ending with … only when cut', () => {
    for (const entry of teacherAnswerKey) {
      const { stem, stemOpening: opening } = locateTask(entry.id);
      const text = openingText(opening);
      expect(stem.startsWith(text), entry.id).toBe(true);
      if (opening === stem) continue;
      expect(opening.endsWith('…') || opening.endsWith('…”'), entry.id).toBe(true);
      const next = stem.slice(text.length);
      expect(next, entry.id).toMatch(/^[\s.,:;־-]/u);
    }
  });

  it('never splits a math run: the opening re-segments into whole math runs of the stem', () => {
    for (const entry of teacherAnswerKey) {
      const { stem, stemOpening: opening } = locateTask(entry.id);
      const stemRuns = segmentMathText(stem).filter(segment => segment.kind === 'math').map(segment => segment.source);
      const openingRuns = segmentMathText(opening).filter(segment => segment.kind === 'math').map(segment => segment.source);
      expect(openingRuns, entry.id).toEqual(stemRuns.slice(0, openingRuns.length));
    }
  });

  it('keeps openings reasonably short', () => {
    for (const entry of teacherAnswerKey) {
      const { stemOpening: opening } = locateTask(entry.id);
      const words = openingText(opening).split(/\s+/).length;
      expect(words, entry.id).toBeLessThanOrEqual(3 * STEM_OPENING_WORDS);
    }
  });

  it('does not end a cut opening on a dangling function word', () => {
    const stem = 'הישרים k ו־m מקבילים. נתון כי ∠C = 124°. חשבו את גודלה של ∠D.';
    expect(stemOpening(stem, 7)).toBe('הישרים k ו־m מקבילים. נתון כי ∠C = 124°…');
    expect(stemOpening(stem, 5)).toBe('הישרים k ו־m מקבילים…');
    expect(stemOpening('א ב ג ד ה ו את ח ט י כ', 7)).toBe('א ב ג ד ה ו…');
  });

  it('renders every opening in the guide through MathText', () => {
    for (const answer of renderedAnswers()) {
      const { stemOpening: opening } = locateTask(answer.id);
      const runs = segmentMathText(opening).filter(segment => segment.kind === 'math');
      for (const run of runs) {
        expect(answer.html, answer.id).toContain(`<span aria-label="${run.source.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}">`);
      }
      expect(answer.html).toMatch(/<p class="teacher-answer-stem">/);
    }
  });
});

describe('teacher guide — flat printed layout', () => {
  const css = fs.readFileSync(path.join(root, 'src/styles/teacher-print.css'), 'utf8');
  const rules = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}@]+)\{([^{}]*)\}/g)]
    .map(match => ({ selector: match[1]!.trim(), body: match[2]! }));

  it('puts no fill, radius or shadow on anything inside the page (only the screen sheet has a shadow)', () => {
    for (const { selector, body } of rules) {
      const isSheet = /^(html,\s*body,\s*#teacher-root|body|\.teacher-document)$/.test(selector);
      if (!isSheet) expect(body, selector).not.toMatch(/background|box-shadow/);
      expect(body, selector).not.toMatch(/border-radius/);
    }
  });

  it('separates answers with hairline rules, not boxes', () => {
    const card = rules.find(rule => rule.selector === '.teacher-answer-card');
    expect(card?.body).not.toMatch(/border/);
    const note = rules.find(rule => rule.selector === '.teacher-answer-note');
    expect(note?.body).toMatch(/border-inline-start:\s*\.5mm solid/);
  });

  it('shows the topic summary as a plain table, not as statistic tiles', () => {
    const table = /<table class="teacher-contents">[\s\S]*?<\/table>/.exec(teacherHtml)?.[0] ?? '';
    expect(visibleText(table)).toContain('58');
    expect(table).toContain('<caption>תוכן המדריך</caption>');
  });

  it('flows short-answer pages two per row and keeps proofs and long lines at full width', () => {
    expect(answerFlow([{ proof: ['a'] }])).toBe('single');
    expect(answerFlow(['x'.repeat(COLUMN_FLOW_MAX_LINE + 1)])).toBe('single');
    expect(answerFlow(['שוות', { values: { x: 16 }, justification: 'x'.repeat(COLUMN_FLOW_MAX_LINE) }])).toBe('columns');

    const grids = [...teacherHtml.matchAll(/<div class="teacher-answer-grid" data-flow="(columns|single)">([\s\S]*?)<\/section>/g)];
    expect(grids).toHaveLength(15);
    const flows = grids.map(match => match[1]);
    expect(flows).toContain('columns');
    expect(flows).toContain('single');
    for (const [, flow, body] of grids) {
      const rows = body!.split('<div class="teacher-answer-row">').slice(1);
      for (const row of rows) {
        const cards = row.match(/<article class="teacher-answer-card"/g)?.length ?? 0;
        expect(cards).toBeLessThanOrEqual(flow === 'columns' ? 2 : 1);
        expect(cards).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('uses a continuous printed page counter after the cover', () => {
    expect(css).toMatch(/@bottom-left\s*\{[^}]*counter\(page\)/);
    expect(css).toMatch(/@page :first\s*\{[^}]*@bottom-right\s*\{\s*content:\s*none/);
  });
});

describe('teacher guide — teacher language', () => {
  it('keeps the drawing engine vocabulary out of every note and answer', () => {
    const text = visibleText(teacherHtml);
    expect(text).not.toMatch(/\b(top|bottom)-?\d|\bsector|סקטור|מיפוי/i);
    for (const entry of teacherAnswerKey) {
      if (entry.note) expect(entry.note, entry.id).not.toMatch(/[A-Za-z]{2,}/);
    }
  });
});
