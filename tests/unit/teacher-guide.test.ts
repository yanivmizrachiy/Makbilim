import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import App from '../../src/App';
import TeacherApp, { answerFlow, COLUMN_FLOW_MAX_LINE } from '../../src/TeacherApp';
import { segmentMathText } from '../../src/components/MathText';
import { teacherAnswerKey } from '../../src/content/answer-key';
import { TASK_KIND_LABEL, taskKindById } from '../../src/content/task-kinds';
import { describeLocation, locateTask, stemOpening, STEM_OPENING_WORDS } from '../../src/content/teacher-locator';

/**
 * The teacher guide as a printed answer key for UNNUMBERED student pages:
 *  - every answer names the question by its ● position on its student page, and that position
 *    is proven against the rendered student booklet (not against the content arrays);
 *  - every answer quotes the opening words of the stem without breaking a math run;
 *  - the typography is flat: hairline rules, no cards, tiles, tints, radii or shadows;
 *  - teacher notes are written in teacher language, not in the drawing engine's vocabulary.
 */

const root = process.cwd();
const studentHtml = renderToStaticMarkup(createElement(App));
const teacherHtml = renderToStaticMarkup(createElement(TeacherApp));

const decode = (value: string) =>
  value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&');

type RenderedStudentPage = { unit: number; page: number; taskIds: string[]; markers: number };

/** The student booklet as rendered: per A4 page, the task ids of its ● questions in document order. */
function renderedStudentPages(): RenderedStudentPage[] {
  const pages: RenderedStudentPage[] = [];
  const token = /<article class="a4-page[^"]*" data-unit="(\d)" data-page="(\d+)"|data-task-id="([^"]+)"|class="question-marker"/g;
  for (const match of studentHtml.matchAll(token)) {
    if (match[1]) {
      pages.push({ unit: Number(match[1]), page: Number(match[2]), taskIds: [], markers: 0 });
      continue;
    }
    const current = pages[pages.length - 1];
    if (!current) throw new Error('question outside an A4 page');
    if (match[3]) current.taskIds.push(match[3]);
    else current.markers += 1;
  }
  return pages.filter(page => page.unit <= 4);
}

/** The rendered teacher answers, in document order. */
function renderedAnswers() {
  const articles = [...teacherHtml.matchAll(/<article class="teacher-answer-card" data-task-id="([^"]+)" data-position="(\d+)">([\s\S]*?)<\/article>/g)];
  return articles.map(match => ({ id: match[1]!, position: Number(match[2]), html: match[3]! }));
}

const visibleText = (html: string) =>
  decode(html.replace(/<span aria-label="([^"]*)">[\s\S]*?<\/span>/g, ' $1 ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

describe('teacher guide — locating an answer on the unnumbered student page', () => {
  const pages = renderedStudentPages();

  it('reads all 15 original student pages and their 58 questions from the rendered booklet', () => {
    expect(pages).toHaveLength(15);
    expect(pages.flatMap(page => page.taskIds)).toHaveLength(58);
  });

  it('gives each task the position of its ● on the rendered student page, counted from the top', () => {
    for (const page of pages) {
      // Every ● on the page is a located task, so "the n-th ●" is unambiguous.
      expect(page.markers, `unit ${page.unit} page ${page.page}`).toBe(page.taskIds.length);
      page.taskIds.forEach((id, index) => {
        const location = locateTask(id);
        expect({ id, unit: location.unit, page: location.page, position: location.position, of: location.questionsOnPage })
          .toEqual({ id, unit: page.unit, page: page.page, position: index + 1, of: page.taskIds.length });
      });
    }
  });

  it('files every answer under the student page its task is printed on', () => {
    for (const entry of teacherAnswerKey) {
      const location = locateTask(entry.id);
      expect([location.unit, location.page], entry.id).toEqual([entry.unit, entry.page]);
    }
  });

  it('prints the answers in booklet order: unit, student page, then ● position', () => {
    const answers = renderedAnswers();
    expect(answers).toHaveLength(58);
    const booklet = pages.flatMap(page => page.taskIds);
    expect(answers.map(answer => answer.id)).toEqual(booklet);
  });

  it('heads every answer with its ● position, the student task-type label, and its unit and page', () => {
    for (const answer of renderedAnswers()) {
      const location = locateTask(answer.id);
      expect(answer.position, answer.id).toBe(location.position);
      expect(answer.html).toContain('<span class="teacher-answer-marker" aria-hidden="true">●</span>');
      expect(answer.html).toContain(`<span class="teacher-answer-position-number">${location.position}</span>`);
      expect(answer.html).toContain(`<span class="teacher-answer-kind">${TASK_KIND_LABEL[taskKindById(answer.id)]}</span>`);
      expect(visibleText(answer.html)).toContain(`יחידה ${location.unit} · עמוד ${location.page}`);
      // Spelled out for screen readers and as a tooltip: "the third question on page 2 of unit 1".
      expect(answer.html).toContain(`title="${describeLocation(location)}"`);
      expect(describeLocation(location)).toMatch(/^השאלה (הראשונה|השנייה|השלישית|הרביעית) בעמוד \d של יחידה [1-4]$/);
    }
  });

  it('never prints a question number the student page does not have ("שאלה N")', () => {
    expect(visibleText(teacherHtml)).not.toMatch(/שאלה \d/);
  });

  it('heads every student page with how many ● it has, counted from the top', () => {
    for (const page of pages) {
      const heading = new RegExp(`<h3 id="teacher-u${page.unit}-p${page.page}">[\\s\\S]*?</header>`).exec(teacherHtml)?.[0];
      expect(heading, `unit ${page.unit} page ${page.page}`).toBeDefined();
      expect(visibleText(heading!)).toContain(`● 1–${page.taskIds.length} מלמעלה למטה`);
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
      // The cut falls on a word boundary of the stem.
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

  it('keeps openings short, and tells apart the questions of one student page', () => {
    const byPage = new Map<string, string[]>();
    for (const entry of teacherAnswerKey) {
      const location = locateTask(entry.id);
      const key = `${location.unit}-${location.page}`;
      byPage.set(key, [...(byPage.get(key) ?? []), location.stemOpening]);
      const words = openingText(location.stemOpening).split(/\s+/).length;
      // A math run such as "∠A = 68°" counts as one word; the raw space count is an upper bound.
      expect(words, entry.id).toBeLessThanOrEqual(3 * STEM_OPENING_WORDS);
    }
    for (const [page, openings] of byPage) expect(new Set(openings).size, page).toBe(openings.length);
  });

  it('does not end a cut opening on a dangling function word', () => {
    const stem = 'הישרים k ו־m מקבילים. נתון כי ∠C = 124°. חשבו את גודלה של ∠D.';
    expect(stemOpening(stem, 7)).toBe('הישרים k ו־m מקבילים. נתון כי ∠C = 124°…');
    // "נתון" (5th word) would dangle: the cut moves back to the end of the previous sentence.
    expect(stemOpening(stem, 5)).toBe('הישרים k ו־m מקבילים…');
    expect(stemOpening('א ב ג ד ה ו את ח ט י כ', 7)).toBe('א ב ג ד ה ו…');
    expect(stemOpening('לפניכם נימוק שכתב תלמיד: „∠A = ∠B כי הן זוויות מתאימות בין ישרים מקבילים”.', 5)).toBe('לפניכם נימוק שכתב תלמיד: „∠A = ∠B…”');
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
    expect(css).not.toMatch(/teacher-summary-grid|teacher-soft/);
  });

  it('separates answers with hairline rules, not boxes', () => {
    const card = rules.find(rule => rule.selector === '.teacher-answer-card');
    expect(card?.body).not.toMatch(/border/);
    const row = rules.find(rule => rule.selector === '.teacher-answer-row');
    expect(row?.body).toMatch(/border-top:\s*\.2mm solid/);
    const note = rules.find(rule => rule.selector === '.teacher-answer-note');
    expect(note?.body).toMatch(/border-inline-start:\s*\.5mm solid/);
    expect(note?.body).not.toMatch(/border(-top|-bottom|-inline-end)?:/);
    expect(teacherHtml).not.toContain('teacher-summary-grid');
  });

  it('shows the per-unit counts as a plain table, not as statistic tiles', () => {
    const table = /<table class="teacher-contents">[\s\S]*?<\/table>/.exec(teacherHtml)?.[0] ?? '';
    for (const count of ['14', '24', '12', '8', '58']) expect(visibleText(table)).toContain(count);
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

  it('starts each unit on a new printed sheet, with a running footer after the cover', () => {
    expect(rules.find(rule => rule.selector === '.teacher-unit')?.body).toMatch(/break-before:\s*page/);
    expect(css).toMatch(/@bottom-left\s*\{[^}]*counter\(page\)/);
    expect(css).toMatch(/@page :first\s*\{[^}]*@bottom-right\s*\{\s*content:\s*none/);
  });
});

describe('teacher guide — teacher language', () => {
  it('keeps the drawing engine vocabulary out of every note and answer', () => {
    const text = visibleText(teacherHtml);
    expect(text).not.toMatch(/\b(top|bottom)-?\d|\bsector|סקטור|מיפוי/i);
    for (const entry of teacherAnswerKey) {
      // Latin letters in a note are only variables and line names (a, p, x, ∠A), never words.
      if (entry.note) expect(entry.note, entry.id).not.toMatch(/[A-Za-z]{2,}/);
    }
  });

  /**
   * Where a sector of the drawing lies, in the words a teacher uses: above/below its line, and
   * left/right of the transversal, as printed (SVG y grows downwards). Sectors are indexed as in
   * ParallelLinesDiagram: the four rays of line and transversal sorted by direction.
   */
  function sectorWords(lineDeg: number, transversalDeg: number, sector: number) {
    const norm = (deg: number) => ((deg % 360) + 360) % 360;
    const rays = [lineDeg, transversalDeg, lineDeg + 180, transversalDeg + 180].map(norm).sort((a, b) => a - b);
    const start = rays[sector]!;
    const end = rays[(sector + 1) % 4]! + (sector === 3 ? 360 : 0);
    const mid = ((start + end) / 2) * Math.PI / 180;
    const v = { x: Math.cos(mid), y: Math.sin(mid) };
    const line = lineDeg * Math.PI / 180;
    const normal = { x: Math.sin(line), y: -Math.cos(line) };
    const up = normal.y < 0 ? normal : { x: -normal.x, y: -normal.y };
    const t = transversalDeg * Math.PI / 180;
    const along = Math.sin(t) < 0 ? { x: Math.cos(t), y: Math.sin(t) } : { x: -Math.cos(t), y: -Math.sin(t) };
    return {
      above: v.x * up.x + v.y * up.y > 0,
      left: along.x * v.y - along.y * v.x < 0,
    };
  }

  const drawing = (taskVar: string) => {
    const source = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
    const line = source.split('\n').find(text => text.includes(`taskId={${taskVar}.id}`)) ?? '';
    const number = (name: string) => Number(new RegExp(`${name}=\\{(-?\\d+)\\}`).exec(line)?.[1]);
    const sector = Number(/intersection: 'top', sector: (\d)/.exec(line)?.[1]);
    return { orientation: number('orientationDeg'), transversal: number('transversalDeg'), sector };
  };

  const phrase = ({ above, left }: { above: boolean; left: boolean }, line: 'העליון' | 'התחתון') =>
    `${above ? `מעל הישר ${line}` : `מתחת לישר ${line}`} ו${left ? 'משמאל' : 'מימין'}`;

  it.each([
    ['U1-P1-B', 'b', 0],
    ['U1-P1-C', 'c', 2],
  ] as const)('%s: the note places the marked angle and its mate exactly where the drawing has them', (id, taskVar, mateOffset) => {
    const { orientation, transversal, sector } = drawing(taskVar);
    expect(Number.isFinite(orientation) && Number.isFinite(transversal) && Number.isFinite(sector), id).toBe(true);
    const note = teacherAnswerKey.find(entry => entry.id === id)?.note ?? '';
    const marked = sectorWords(orientation, transversal, sector);
    const mate = sectorWords(orientation, transversal, (sector + mateOffset) % 4);
    expect(note).toContain(`במפגש העליון, ${phrase(marked, 'העליון')} לישר החותך`);
    expect(note).toContain(`${phrase(mate, 'התחתון')} לחותך`);
    expect(note).toContain('במפגש התחתון');
  });

  it('labels the note for the teacher and keeps it a thin rule, not a boxed card', () => {
    expect(teacherHtml.match(/<aside class="teacher-answer-note"><strong>הערה למורה:<\/strong>/g)?.length)
      .toBe(teacherAnswerKey.filter(entry => entry.note).length);
  });
});
