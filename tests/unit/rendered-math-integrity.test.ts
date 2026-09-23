import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import App from '../../src/App';

/**
 * Rendered math integrity — checks the math islands that MathText actually emits
 * for the whole student booklet (units 1-4), without a browser.
 *
 * Why: every inline math token is an isolated LTR island (<bdi dir="ltr">) inside an
 * RTL paragraph. If one expression is split into several islands with a bare operator
 * between them (e.g. `∠A` | ` + ` | `∠C = 180°`), the RTL layout places the islands
 * right-to-left and the student READS THE MATH IN REVERSED ORDER
 * ("∠C = 180° + ∠A" instead of "∠A + ∠C = 180°"). An expression must be one island.
 */

const html = renderToStaticMarkup(createElement(App));

const decode = (value: string) =>
  value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&');

const MATH_ISLAND = /<bdi class="math mathjax-inline" dir="ltr"><span aria-label="([^"]*)"/g;
const mathSources = [...html.matchAll(MATH_ISLAND)].map(match => decode(match[1] ?? ''));

// An island, then plain text, then (lookahead) the next island — overlapping chains included.
const ADJACENT_ISLANDS =
  /<span aria-label="([^"]*)">[^<]*<\/span><\/bdi>([^<]*)(?=<bdi class="math mathjax-inline" dir="ltr"><span aria-label="([^"]*)")/g;
const OPERATOR_ONLY = /^[\s+\-−=×÷·:<>≤≥≠]+$/;

const fragmentedExpressions = [...html.matchAll(ADJACENT_ISLANDS)]
  .map(match => ({ left: decode(match[1] ?? ''), between: decode(match[2] ?? ''), right: decode(match[3] ?? '') }))
  .filter(({ between }) => between.trim().length > 0 && OPERATOR_ONLY.test(between))
  .map(({ left, between, right }) => `"${left}" ${between.trim()} "${right}"`);

describe('rendered math integrity (units 1-4)', () => {
  it('renders the booklet math through MathText islands', () => {
    expect(mathSources.length).toBeGreaterThan(50);
  });

  it('never splits one expression into separate islands (prevents bidi reversal of the math)', () => {
    expect(fragmentedExpressions).toEqual([]);
  });

  it('never places Hebrew inside a math island', () => {
    expect(mathSources.filter(source => /[֐-׿]/.test(source))).toEqual([]);
  });
});
