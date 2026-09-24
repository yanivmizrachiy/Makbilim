import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import App from '../../src/App';
import TeacherApp from '../../src/TeacherApp';
import { AUTHORED_TASK_IDS } from '../../src/content/booklet';

/**
 * Rendered math integrity — checks the math islands that MathText actually emits,
 * for the whole student booklet (units 1-4) and the teacher guide, without a browser.
 *
 * Why: every inline math token is an isolated LTR island (<bdi dir="ltr">) inside an
 * RTL paragraph. If one expression is split into several islands with a bare operator
 * between them (e.g. `∠A` | ` + ` | `∠C = 180°`), the RTL layout places the islands
 * right-to-left and the reader SEES THE MATH IN REVERSED ORDER
 * ("∠C = 180° + ∠A" instead of "∠A + ∠C = 180°"). An expression must be one island.
 */

const decode = (value: string) =>
  value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&');

const MATH_ISLAND = /<bdi class="math mathjax-inline" dir="ltr"><span aria-label="([^"]*)"/g;
// An island, then plain text, then (lookahead) the next island — overlapping chains included.
const ADJACENT_ISLANDS =
  /<span aria-label="([^"]*)">[^<]*<\/span><\/bdi>([^<]*)(?=<bdi class="math mathjax-inline" dir="ltr"><span aria-label="([^"]*)")/g;
const OPERATOR_ONLY = /^[\s+\-−=×÷·:<>≤≥≠]+$/;
// Characters that must never sit in plain RTL text: in an RTL run they reorder around digits/letters.
const MATH_SYMBOL = /[∠∥°⊥△≠≤≥×÷α-ωΑ-Ω]/;

function inspect(html: string) {
  const mathSources = [...html.matchAll(MATH_ISLAND)].map(match => decode(match[1] ?? ''));
  const fragmentedExpressions = [...html.matchAll(ADJACENT_ISLANDS)]
    .map(match => ({ left: decode(match[1] ?? ''), between: decode(match[2] ?? ''), right: decode(match[3] ?? '') }))
    .filter(({ between }) => between.trim().length > 0 && OPERATOR_ONLY.test(between))
    .map(({ left, between, right }) => `"${left}" ${between.trim()} "${right}"`);
  // Visible text only: drop math islands, SVG drawings (their labels live in an LTR group), then all tags.
  const visibleText = decode(
    html
      .replace(/<bdi class="math mathjax-inline"[\s\S]*?<\/bdi>/g, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ');
  const plainTextMath = visibleText
    .split(/(?<=[.!?:;])\s|\s{2,}/)
    .filter(chunk => MATH_SYMBOL.test(chunk));
  return { mathSources, fragmentedExpressions, visibleText, plainTextMath };
}

describe.each([
  ['student booklet (units 1-4)', createElement(App), 50],
  ['teacher guide', createElement(TeacherApp), 100],
] as const)('rendered math integrity — %s', (_name, element, minimumIslands) => {
  const report = inspect(renderToStaticMarkup(element));

  it('renders its math through MathText islands', () => {
    expect(report.mathSources.length).toBeGreaterThan(minimumIslands);
  });

  it('never splits one expression into separate islands (prevents bidi reversal of the math)', () => {
    expect(report.fragmentedExpressions).toEqual([]);
  });

  it('never places Hebrew inside a math island', () => {
    expect(report.mathSources.filter(source => /[֐-׿]/.test(source))).toEqual([]);
  });

  it('never leaves a math symbol in plain RTL text', () => {
    expect(report.plainTextMath).toEqual([]);
  });
});

describe('teacher guide is written for teachers', () => {
  const html = renderToStaticMarkup(createElement(TeacherApp));
  const { visibleText, mathSources } = inspect(html);

  it('shows every authored answer, each with its global number, the student-page task-type label and the stem opening', () => {
    expect(html.match(/<article class="teacher-answer-card"/g)).toHaveLength(AUTHORED_TASK_IDS.length);
    expect(html.match(/<span class="teacher-answer-kind">/g)).toHaveLength(62);
    const cards = html.match(/<article class="teacher-answer-card"[\s\S]*?<\/article>/g) ?? [];
    expect(cards).toHaveLength(62);
    for (const card of cards) {
      expect(card).toMatch(/<span class="teacher-answer-position-number">\d+<\/span>/);
      expect(card).toMatch(/<span class="teacher-answer-kind">[^<]+<\/span>/);
      expect(card).toMatch(/<p class="teacher-answer-stem">/);
    }
    expect(html).toContain('data-answer-count="62"');
  });

  it('prints no internal ids, raw data keys, filenames or repository codes', () => {
    expect(visibleText).not.toMatch(/U[1-5]-P\d-[A-E]/);
    expect(visibleText).not.toMatch(/\b(values|choice|completions|conclusion|unneededDatum|requiredDatum|proof|reason|justification)\b/);
    expect(visibleText).not.toMatch(/answer-key|\.ts\b|bbb|BBB|not-provided|yanivmizrachiy/);
  });

  it('gives every computed angle its degree sign and every variable none', () => {
    const valueLines = mathSources.filter(source => /^(∠[A-Z]|[α-δ](?: \+ [α-δ])?|x|y) = \d+°?$/.test(source));
    expect(valueLines.length).toBeGreaterThan(20);
    for (const line of valueLines) {
      if (/^[xy] =/.test(line)) expect(line).not.toContain('°');
      else expect(line.endsWith('°')).toBe(true);
    }
  });
});
