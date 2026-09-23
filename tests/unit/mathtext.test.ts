import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  BLANK_WIDTH_EM,
  MATH_OPERAND_RULES,
  MATH_OPERATOR_RULES,
  MATH_POSTFIX_RULES,
  MathText,
  isMathToken,
  segmentMathText,
  tokenizeMathText,
  toTeX,
} from '../../src/components/MathText';

/** Marks math runs with ⟦…⟧ so a whole tokenisation reads as one string. */
const mark = (text: string) =>
  segmentMathText(text).map(segment => (segment.kind === 'math' ? `⟦${segment.source}⟧` : segment.source)).join('');

describe('MathText canonical notation', () => {
  it('converts geometry and algebra symbols to TeX for MathJax SVG', () => {
    expect(toTeX('∠ABC = 64°')).toContain('\\angle');
    expect(toTeX('∠ABC = 64°')).toContain('64^{\\circ}');
    expect(toTeX('p ∥ q')).toContain('\\parallel');
    expect(toTeX('α = 2x + 5°')).toContain('\\alpha');
    expect(toTeX('α = 2x + 5°')).toContain('2x + 5^{\\circ}');
    // Exact form (was `toContain('\\ell _{1}')`): the subscript now attaches without a stray space.
    expect(toTeX('ℓ₁ ∥ ℓ₂')).toBe('\\ell_{1} \\parallel \\ell_{2}');
  });

  it('recognizes the notation families used in the workbook', () => {
    for (const token of ['∠A = 68°', 'p ∥ q', 'x + 5', '2x − 7', '64°', 'α', 'β']) {
      expect(isMathToken(token), token).toBe(true);
    }
    expect(isMathToken('ישרים מקבילים')).toBe(false);
  });

  it('separates Hebrew instructions from embedded mathematical notation', () => {
    const parts = tokenizeMathText('נתון p ∥ q ו־∠A = 68°. מצאו x + 5.');
    expect(parts.some(part => part.includes('נתון'))).toBe(true);
    expect(parts).toContain('p ∥ q');
    expect(parts).toContain('∠A = 68°');
    expect(parts).toContain('x + 5');
    expect(parts.filter(isMathToken).length).toBe(3);
    expect(parts.join('')).toBe('נתון p ∥ q ו־∠A = 68°. מצאו x + 5.');
  });
});

describe('MathText tokenizer structure', () => {
  it('is driven by ordered, named rule tables with sticky regexes', () => {
    expect(MATH_OPERAND_RULES.map(rule => rule.name)).toEqual([
      'angle', 'triangle', 'group', 'vulgar-fraction', 'number', 'greek', 'script-letter', 'point-name', 'variable', 'blank',
    ]);
    expect(MATH_POSTFIX_RULES.map(rule => rule.name)).toEqual(['subscript', 'prime', 'power', 'degree']);
    expect(MATH_OPERATOR_RULES.map(rule => rule.name)).toEqual([
      'relation', 'parallel', 'perpendicular', 'arrow', 'additive', 'hyphen-minus', 'multiplicative', 'ratio', 'fraction',
    ]);
    for (const rule of [...MATH_OPERAND_RULES, ...MATH_POSTFIX_RULES, ...MATH_OPERATOR_RULES]) {
      expect(rule.pattern.sticky, rule.name).toBe(true);
      expect(rule.description.length, rule.name).toBeGreaterThan(10);
      // No rule may ever match Hebrew letters, maqaf (U+05BE), geresh (U+05F3) or gershayim (U+05F4).
      for (const hebrew of ['א', 'ו', 'ת', '\u{5BE}', '\u{5F3}', '\u{5F4}']) {
        rule.pattern.lastIndex = 0;
        expect(rule.pattern.test(hebrew), `${rule.name} matches ${hebrew}`).toBe(false);
      }
    }
  });

  it('records which rule produced every atom of a run', () => {
    const [segment] = segmentMathText('∠A = 68°');
    expect(segment?.kind).toBe('math');
    if (segment?.kind !== 'math') return;
    expect(segment.atoms.map(atom => `${atom.rule}:${atom.source}`)).toEqual(['angle:∠A', 'relation:=', 'number:68', 'degree:°']);
    const [fraction] = segmentMathText('(x+1)/2');
    if (fraction?.kind !== 'math') throw new Error('expected math');
    expect(fraction.atoms.map(atom => atom.rule)).toEqual(['group', 'variable', 'additive', 'number', 'group', 'fraction', 'number']);
  });
});

describe('MathText constructs → TeX', () => {
  const cases: ReadonlyArray<readonly [string, string]> = [
    // variables, coefficients, subscripts
    ['x', 'x'], ['y', 'y'], ['2x', '2x'], ['x_1 + x_2', 'x_{1} + x_{2}'], ['ℓ₁ ∥ ℓ₂', '\\ell_{1} \\parallel \\ell_{2}'],
    // fractions
    ['1/2', '\\frac{1}{2}'], ['a/b', '\\frac{a}{b}'], ['(x + 1)/2', '\\frac{x + 1}{2}'], ['½', '\\frac{1}{2}'],
    ['¾x', '\\frac{3}{4}x'], ['-1/2', '-\\frac{1}{2}'], ['180°/2', '\\frac{180^{\\circ}}{2}'],
    // powers
    ['x²', 'x^{2}'], ['x^2', 'x^{2}'], ['x^{10}', 'x^{10}'], ['2⁻¹', '2^{-1}'], ['x² + y² = 25', 'x^{2} + y^{2} = 25'],
    ['x²°', '{x^{2}}^{\\circ}'],
    // relations and operators
    ['x ≠ 5', 'x \\neq 5'], ['x ≤ 3', 'x \\leq 3'], ['y ≥ 2', 'y \\geq 2'], ['AB = CD', 'AB = CD'],
    ['2 × 3', '2 \\times 3'], ['6 ÷ 2', '6 \\div 2'], ['2 · 3', '2 \\cdot 3'], ['x = −5', 'x = -5'], ['2x-5', '2x - 5'],
    // geometry
    ['AB ⊥ CD', 'AB \\perp CD'], ['AB ∥ CD', 'AB \\parallel CD'], ['△ABC', '\\triangle ABC'], ['∆ABC', '\\triangle ABC'],
    ['ΔABC', '\\triangle ABC'], ['∠ABC', '\\angle ABC'], ['∠1', '\\angle 1'], ['∠α', '\\angle \\alpha'],
    ['∡B', '\\measuredangle B'], ['∠A₁', '\\angle A_{1}'], ['∠ABC = ∠DEF', '\\angle ABC = \\angle DEF'],
    ['∠1 ↔ ∠5', '\\angle 1 \\leftrightarrow \\angle 5'],
    // primes
    ["α'", "\\alpha'"], ['β″', "\\beta''"], ["A'", "A'"], ["∠A'", "\\angle A'"],
    // degrees, including decimals and expressions
    ['37.5°', '37.5^{\\circ}'], ['x°', 'x^{\\circ}'], ['(4x + 6)°', '(4x + 6)^{\\circ}'], ['180°−x', '180^{\\circ} - x'],
    // whole expressions and equations as ONE run
    ['2x+10 = 3x−20', '2x + 10 = 3x - 20'], ['2x + 35 = 180 − (5x − 19)', '2x + 35 = 180 - (5x - 19)'],
    ['(2x + 35) + (5x − 19) = 180', '(2x + 35) + (5x - 19) = 180'], ['3(x + 2) = 12', '3(x + 2) = 12'],
    ['∠A + ∠C = 180°', '\\angle A + \\angle C = 180^{\\circ}'], ['α + β', '\\alpha + \\beta'],
    // ratios
    ['2:3', '2 : 3'], ['AB : CD', 'AB : CD'],
    // Greek letters keep the glyph that was typed (ε is \varepsilon, φ is \varphi in TeX)
    ['α', '\\alpha'], ['β', '\\beta'], ['γ', '\\gamma'], ['θ', '\\theta'], ['ε', '\\varepsilon'], ['φ', '\\varphi'],
    ['Δ', '\\Delta'],
  ];

  it.each(cases)('%s → %s', (source, tex) => {
    expect(isMathToken(source), source).toBe(true);
    expect(toTeX(source)).toBe(tex);
  });
});

describe('MathText groups whole expressions into one inline run', () => {
  it.each([
    ['גודלי הזוויות הם (2x + 35)° ו־(5x − 19)°.', 'גודלי הזוויות הם ⟦(2x + 35)°⟧ ו־⟦(5x − 19)°⟧.'],
    ['פתרו: 2x+10 = 3x−20.', 'פתרו: ⟦2x+10 = 3x−20⟧.'],
    ['הוכיחו כי ∠A + ∠C = 180°.', 'הוכיחו כי ⟦∠A + ∠C = 180°⟧.'],
    ['בחרו את הנימוק המתאים לטענה ∠A = ∠B.', 'בחרו את הנימוק המתאים לטענה ⟦∠A = ∠B⟧.'],
    ['חשבו את α + β ונמקו.', 'חשבו את ⟦α + β⟧ ונמקו.'],
    ['היחס בין הזוויות הוא 2:3.', 'היחס בין הזוויות הוא ⟦2:3⟧.'],
    ['נתון כי x = 20, ולכן ∠A = 74°.', 'נתון כי ⟦x = 20⟧, ולכן ⟦∠A = 74°⟧.'],
    ['הזווית היא 180°−x ולכן', 'הזווית היא ⟦180°−x⟧ ולכן'],
    ['המשולש △ABC ישר זווית ו־AB ⊥ BC.', 'המשולש ⟦△ABC⟧ ישר זווית ו־⟦AB ⊥ BC⟧.'],
    ['חצי מהזווית הוא ½ · 64° = 32°.', 'חצי מהזווית הוא ⟦½ · 64° = 32°⟧.'],
  ])('%s', (text, expected) => {
    expect(mark(text)).toBe(expected);
  });
});

describe('MathText never pulls Hebrew text or punctuation into math', () => {
  it.each([
    ['∠A = 68°.', '⟦∠A = 68°⟧.'],
    ['הישרים a ו־b מקבילים.', 'הישרים ⟦a⟧ ו־⟦b⟧ מקבילים.'],
    ['משלימות ל־180°.', 'משלימות ל־⟦180°⟧.'],
    ['משלימות ל-180°.', 'משלימות ל-⟦180°⟧.'],
    ['ו-x', 'ו-⟦x⟧'],
    ['„∠A = ∠B כי הן מתאימות”', '„⟦∠A = ∠B⟧ כי הן מתאימות”'],
    ['השורה החסרה: ∠A = ∠B.', 'השורה החסרה: ⟦∠A = ∠B⟧.'],
    ['האם p ∥ q?', 'האם ⟦p ∥ q⟧?'],
    ['נתון ∠E = 35°; הוכיחו.', 'נתון ⟦∠E = 35°⟧; הוכיחו.'],
    ['סעיף א׳ ו־x', 'סעיף א׳ ו־⟦x⟧'],
    ['(ב) x', '(ב) ⟦x⟧'],
    // A blank after a relation belongs to its expression: split, the RTL line could show "____ = x".
    ['x = ____', '⟦x = ____⟧'],
    // Stays plain text: numbering, ranges, bare numbers, words, Hebrew in parentheses.
    ['שורה 1: מתאימות', 'שורה 1: מתאימות'],
    ['יחידות 1–4', 'יחידות 1–4'],
    ['עמודים 3-5', 'עמודים 3-5'],
    ['נתון 5-3 = 2 וגם 2x-5', 'נתון ⟦5-3 = 2⟧ וגם ⟦2x-5⟧'],
    ['הזווית היא 37.5 מעלות', 'הזווית היא 37.5 מעלות'],
    ['(ראו סעיף 2)', '(ראו סעיף 2)'],
    ['מסילה 1', 'מסילה 1'],
    ['ו/או', 'ו/או'],
    ['top-1 ↔ bottom-3', 'top-1 ↔ bottom-3'],
    ['x2 U2 ABCD', 'x2 U2 ABCD'],
    ['(1)', '(1)'],
  ])('%s', (text, expected) => {
    expect(mark(text)).toBe(expected);
    for (const segment of segmentMathText(text)) {
      if (segment.kind !== 'math') continue;
      expect(segment.source).not.toMatch(/\p{Script=Hebrew}/u);
      expect(segment.source).toBe(segment.source.trim());
    }
  });
});

describe('MathText rendering', () => {
  it('isolates each run in <bdi dir="ltr"> with the source as aria-label and keeps Hebrew outside', () => {
    const html = renderToStaticMarkup(createElement(MathText, { text: 'נתון כי ∠A = 68°. חשבו את α + β.' }));
    expect(html).toBe(
      'נתון כי '
      + '<bdi class="math mathjax-inline" dir="ltr"><span aria-label="∠A = 68°">\\(\\angle A = 68^{\\circ}\\)</span></bdi>'
      + '. חשבו את '
      + '<bdi class="math mathjax-inline" dir="ltr"><span aria-label="α + β">\\(\\alpha + \\beta\\)</span></bdi>'
      + '.',
    );
  });

  it('renders text without math unchanged', () => {
    expect(renderToStaticMarkup(createElement(MathText, { text: 'השלימו את הטבלה.' }))).toBe('השלימו את הטבלה.');
  });
});

describe('MathText hardening (review follow-ups)', () => {
  it('keeps a quoted Latin letter quoted instead of turning the closing quote into a prime', () => {
    expect(mark("סעיף 'x' בשרטוט")).toBe("סעיף '⟦x⟧' בשרטוט");
    expect(mark("הנקודה A' היא תמונת A")).toBe("הנקודה ⟦A'⟧ היא תמונת ⟦A⟧");
    expect(mark('α′ = 40°')).toBe('⟦α′ = 40°⟧');
  });

  it('does not typeset technical acronyms as point names', () => {
    expect(mark('קובץ PDF להדפסה')).toBe('קובץ PDF להדפסה');
    expect(mark('תצוגת RTL')).toBe('תצוגת RTL');
    expect(mark('המשולש ABC והקטע AB')).toBe('המשולש ⟦ABC⟧ והקטע ⟦AB⟧');
  });

  it('keeps a fill-in blank inside its expression as one LTR run', () => {
    expect(mark('רשמו: x = ____')).toBe('רשמו: ⟦x = ____⟧');
    expect(mark('לכן ∠B = ____°.')).toBe('לכן ⟦∠B = ____°⟧.');
    const [, run] = segmentMathText('רשמו: x = ____');
    expect(run?.kind === 'math' ? run.tex : '').toContain(`\\underline{\\hspace{${BLANK_WIDTH_EM}em}}`);
  });

  it('makes a typed blank wide enough to handwrite a three-digit value', () => {
    // 4.5em of the math font is about 18mm at 11.7pt, so '124' written by hand fits; the former
    // 2em (about 8mm) did not. The expectation is pinned to the exact TeX so a narrowing is caught.
    expect(BLANK_WIDTH_EM).toBeGreaterThanOrEqual(4.5);
    const [run] = segmentMathText('∠B = ____°');
    expect(run?.kind === 'math' ? run.tex : '').toBe(`\\angle B = \\underline{\\hspace{${BLANK_WIDTH_EM}em}}^{\\circ}`);
  });

  it('never treats a blank on its own as mathematics', () => {
    expect(mark('זוויות ______ בין ישרים מקבילים שוות.')).toBe('זוויות ______ בין ישרים מקבילים שוות.');
  });
});
