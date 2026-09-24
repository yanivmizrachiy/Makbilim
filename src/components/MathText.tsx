import React, { useEffect, useRef } from 'react';
import { CLOZE_BLANK } from '../content/cloze';

/**
 * Width of a typed blank inside an expression (x = ____, ∠B = ____°), in em of the math font:
 * wide enough to handwrite a three-digit value such as 124.
 */
export const BLANK_WIDTH_EM = 4.5;
const BLANK_TEX = `\\underline{\\hspace{${BLANK_WIDTH_EM}em}}`;

// ─────────────────────────────────────────────────────────────────────────────
// MathText — inline mathematics inside Hebrew (RTL) prose.
//
// A string such as  "נתון p ∥ q ו־∠A = 68°. חשבו את α + β."  is split into
// plain-text segments and *math runs*. Every run is typeset by MathJax 4 (SVG)
// inside <bdi dir="ltr">, so a whole expression such as "∠A + ∠C = 180°" is ONE
// left-to-right island instead of fragments that the RTL paragraph reorders.
//
// Grammar of a math run ("space" = space, NBSP or thin space; never a newline):
//
//   run      := sign? term ( juxtaposed-term | operator sign? term )*
//   term     := operand postfix*
//   operand  := MATH_OPERAND_RULES   (first matching rule wins; "(" run ")" nests)
//   postfix  := MATH_POSTFIX_RULES   (subscript, prime, power, degree — in order)
//   operator := MATH_OPERATOR_RULES  (each with its own spacing policy)
//
// Every rule is a named table entry holding a sticky regex and a TeX converter,
// so a surprising token can be traced to exactly one rule (see `atoms` on each
// math segment returned by `segmentMathText`).
//
// Safety guarantees (locked by tests/unit/mathtext*.test.ts):
//   • No rule matches a Hebrew letter, maqaf, geresh or Hebrew punctuation, so
//     Hebrew text can never be pulled into a math run.
//   • A run never starts or ends with a space and never absorbs sentence
//     punctuation (". , ; ? !"); a comma joins only inside parentheses, as in
//     "(2, x)". ":" joins a run only as a ratio between two operands with
//     symmetric spacing ("2:3", "2 : 3"), never as "שורה 1: …".
//   • Latin letters inside words are not variables: "top", "x2" and "ABCD" stay
//     text. Variables are single letters (x, p, ℓ₁, α) and point names of at most
//     three capitals (A, AB, ABC).
//   • A run made only of plain numbers ("1", "(2)", "37.5", the range "3-5")
//     stays text; a run is mathematics only when it holds a variable, an angle,
//     a degree sign, an operator other than the ASCII hyphen, a fraction, a
//     power, a prime or a subscript.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Syntactic class of an operand; it drives juxtaposition and postfix rules.
 * Every kind has a rule in MATH_OPERAND_RULES except `fraction`, which is built
 * by the `fraction` operator from the operands on both sides of a tight slash.
 */
export type MathOperandKind =
  | 'angle'
  | 'triangle'
  | 'group'
  | 'vulgar-fraction'
  | 'number'
  | 'greek'
  | 'script-letter'
  | 'point-name'
  | 'variable'
  | 'blank'
  | 'fraction';

/** One recognised piece of a math run, tagged with the rule that produced it. */
export type MathAtom = {
  readonly rule: string;
  readonly source: string;
  readonly tex: string;
};

export type MathSegment =
  | { readonly kind: 'text'; readonly source: string }
  | { readonly kind: 'math'; readonly source: string; readonly tex: string; readonly atoms: readonly MathAtom[] };

type Operand = {
  readonly kind: MathOperandKind;
  readonly end: number;
  readonly tex: string;
  /** TeX without the outer parentheses of a bare group; used inside \frac{}{}. */
  readonly bareTeX: string;
  /** True when the operand on its own makes a run mathematical (see header). */
  readonly signal: boolean;
  readonly atoms: readonly MathAtom[];
};

type Run = {
  readonly end: number;
  readonly tex: string;
  readonly signal: boolean;
  readonly atoms: readonly MathAtom[];
};

export type MathOperandRule = {
  readonly name: MathOperandKind;
  readonly description: string;
  /** Sticky regex anchored at the scan position (for `group`: the opening parenthesis). */
  readonly pattern: RegExp;
  readonly read: (text: string, index: number, depth: number) => Operand | null;
};

export type MathPostfixRule = {
  readonly name: 'subscript' | 'prime' | 'power' | 'degree';
  readonly description: string;
  readonly pattern: RegExp;
  readonly appliesTo: ReadonlySet<MathOperandKind>;
  readonly toTeX: (match: RegExpExecArray) => string;
};

/**
 * - `free`: any spacing around the symbol ("x+1", "x + 1").
 * - `symmetric`: spaces on both sides or on neither ("2:3", "2 : 3"; not "1: 2").
 * - `tight`: no spaces at all ("a/b").
 */
export type MathOperatorSpacing = 'free' | 'symmetric' | 'tight';

export type MathOperatorRule = {
  readonly name: string;
  readonly description: string;
  readonly pattern: RegExp;
  readonly spacing: MathOperatorSpacing;
  readonly toTeX: (symbol: string) => string;
};

// ── Character tables ─────────────────────────────────────────────────────────

/**
 * Greek letters → TeX. The mapping keeps the glyph the author typed: U+03B5 ε is
 * \varepsilon and U+03C6 φ is \varphi in TeX, while \epsilon/\phi are ϵ/ϕ.
 * Capitals that look like Latin letters are upright, as in TeX.
 */
const GREEK_TEX: Readonly<Record<string, string>> = {
  'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta', 'ε': '\\varepsilon', 'ϵ': '\\epsilon',
  'ζ': '\\zeta', 'η': '\\eta', 'θ': '\\theta', 'ϑ': '\\vartheta', 'ι': '\\iota', 'κ': '\\kappa',
  'λ': '\\lambda', 'μ': '\\mu', 'ν': '\\nu', 'ξ': '\\xi', 'ο': 'o', 'π': '\\pi', 'ϖ': '\\varpi',
  'ρ': '\\rho', 'ϱ': '\\varrho', 'ς': '\\varsigma', 'σ': '\\sigma', 'τ': '\\tau', 'υ': '\\upsilon',
  'φ': '\\varphi', 'ϕ': '\\phi', 'χ': '\\chi', 'ψ': '\\psi', 'ω': '\\omega',
  'Α': '\\mathrm{A}', 'Β': '\\mathrm{B}', 'Γ': '\\Gamma', 'Δ': '\\Delta', 'Ε': '\\mathrm{E}',
  'Ζ': '\\mathrm{Z}', 'Η': '\\mathrm{H}', 'Θ': '\\Theta', 'Ι': '\\mathrm{I}', 'Κ': '\\mathrm{K}',
  'Λ': '\\Lambda', 'Μ': '\\mathrm{M}', 'Ν': '\\mathrm{N}', 'Ξ': '\\Xi', 'Ο': '\\mathrm{O}', 'Π': '\\Pi',
  'Ρ': '\\mathrm{P}', 'Σ': '\\Sigma', 'Τ': '\\mathrm{T}', 'Υ': '\\Upsilon', 'Φ': '\\Phi',
  'Χ': '\\mathrm{X}', 'Ψ': '\\Psi', 'Ω': '\\Omega',
};
const GREEK_CLASS = `[${Object.keys(GREEK_TEX).join('')}]`;

const SUBSCRIPT_DIGITS = '₀₁₂₃₄₅₆₇₈₉';
const SUPERSCRIPT_CHARS: Readonly<Record<string, string>> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁺': '+', '⁻': '-',
};

const VULGAR_FRACTIONS: Readonly<Record<string, readonly [number, number]>> = {
  '½': [1, 2], '⅓': [1, 3], '⅔': [2, 3], '¼': [1, 4], '¾': [3, 4], '⅕': [1, 5], '⅖': [2, 5], '⅗': [3, 5],
  '⅘': [4, 5], '⅙': [1, 6], '⅚': [5, 6], '⅐': [1, 7], '⅛': [1, 8], '⅜': [3, 8], '⅝': [5, 8], '⅞': [7, 8],
  '⅑': [1, 9], '⅒': [1, 10],
};

/** Operator and sign symbols → TeX. Both "-" and "−" (U+2212) typeset as a minus sign. */
const OPERATOR_TEX: Readonly<Record<string, string>> = {
  '=': '=', '≠': '\\neq', '≈': '\\approx', '≡': '\\equiv', '≅': '\\cong', '∼': '\\sim',
  '<': '<', '>': '>', '≤': '\\leq', '≥': '\\geq', '⩽': '\\leqslant', '⩾': '\\geqslant',
  '∥': '\\parallel', '‖': '\\parallel', '∦': '\\nparallel', '⊥': '\\perp', '⟂': '\\perp',
  '↔': '\\leftrightarrow', '→': '\\rightarrow', '⇒': '\\Rightarrow', '⇔': '\\Leftrightarrow',
  '+': '+', '−': '-', '-': '-', '±': '\\pm', '∓': '\\mp',
  '×': '\\times', '·': '\\cdot', '⋅': '\\cdot', '÷': '\\div', ':': ':',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Spaces allowed between members of a run: space, no-break space, thin space, narrow no-break space. */
const SPACE = /[ \u{A0}\u{2009}\u{202F}]/u;
const LATIN_OR_DIGIT = /[A-Za-z0-9]/;
/** Characters after which a run may open with a sign — a space, an opening bracket or quote, or maqaf (U+05BE): "x = −5", "(−3)", "ל־−5". */
const SIGN_OPENERS = /[ \u{A0}\u{2009}\u{202F}([„“"«\u{5BE}]/u;
const SIGN = /[+\-−±∓]/y;
const MAX_GROUP_DEPTH = 6;

const isSpace = (character: string | undefined) => character !== undefined && SPACE.test(character);

/** Concatenates TeX, inserting a space only where a control word would otherwise swallow the next token. */
function joinTeX(left: string, right: string) {
  if (!left) return right;
  if (!right) return left;
  return /\\[A-Za-z]+$/.test(left) && /^[A-Za-z0-9\\]/.test(right) ? `${left} ${right}` : `${left}${right}`;
}

function execAt(pattern: RegExp, text: string, index: number) {
  pattern.lastIndex = index;
  return pattern.exec(text);
}

function atom(rule: string, source: string, tex: string): MathAtom {
  return { rule, source, tex };
}

function regexOperand(
  name: MathOperandKind,
  description: string,
  pattern: RegExp,
  toTeX: (match: RegExpExecArray) => string,
  signal: boolean,
): MathOperandRule {
  return {
    name,
    description,
    pattern,
    read(text, index) {
      const match = execAt(pattern, text, index);
      if (!match) return null;
      const tex = toTeX(match);
      return { kind: name, end: index + match[0].length, tex, bareTeX: tex, signal, atoms: [atom(name, match[0], tex)] };
    },
  };
}

function angleNameTeX(name: string) {
  return GREEK_TEX[name] ?? name;
}

// ── Rule tables ─────────────────────────────────────────────────────────────

const GROUP_OPEN = /\(/y;

/** Ordered operand rules: at a given position the first rule that matches wins. */
export const MATH_OPERAND_RULES: readonly MathOperandRule[] = [
  regexOperand(
    'angle',
    'Angle sign with a vertex or angle name: ∠A, ∠ABC, ∠1, ∠α (∡ is the measured-angle sign).',
    new RegExp(`[∠∡][ \\u{2009}]?(?:([A-Z]{1,3}|[a-z]|\\d{1,2})(?![A-Za-z0-9])|(${GREEK_CLASS}))`, 'uy'),
    match => joinTeX(match[0].startsWith('∡') ? '\\measuredangle' : '\\angle', angleNameTeX(match[1] ?? match[2] ?? '')),
    true,
  ),
  regexOperand(
    'triangle',
    'Triangle sign with three vertices: △ABC, ∆ABC, or Greek Δ written directly before three capitals.',
    /(?:[△∆][ \u{2009}]?|Δ)([A-Z]{3})(?![A-Za-z0-9])/uy,
    match => joinTeX('\\triangle', match[1] ?? ''),
    true,
  ),
  {
    name: 'group',
    description: 'Parenthesised math run, e.g. (4x + 6) or (2, 3); the content must itself be mathematics-only.',
    pattern: GROUP_OPEN,
    read: readGroup,
  },
  regexOperand(
    'vulgar-fraction',
    'Single-character fraction such as ½ or ¾, typeset as \\frac.',
    new RegExp(`[${Object.keys(VULGAR_FRACTIONS).join('')}]`, 'y'),
    match => {
      const [numerator, denominator] = VULGAR_FRACTIONS[match[0]] ?? [0, 0];
      return `\\frac{${numerator}}{${denominator}}`;
    },
    true,
  ),
  regexOperand(
    'number',
    'Integer or decimal number (37.5). A bare number is not mathematics by itself.',
    /\d+(?:\.\d+)?/y,
    match => match[0],
    false,
  ),
  regexOperand(
    'greek',
    'Greek letter (α, β, γ, θ …).',
    new RegExp(GREEK_CLASS, 'y'),
    match => GREEK_TEX[match[0]] ?? match[0],
    true,
  ),
  regexOperand('script-letter', 'Script ell ℓ used as a line name.', /ℓ/y, () => '\\ell', true),
  regexOperand(
    'point-name',
    'One to three capital Latin letters that are not part of a longer word: A, AB, ABC. Known technical acronyms (PDF, SVG, CSS, RTL, LTR) stay text.',
    /(?<![A-Za-z])(?!(?:PDF|SVG|CSS|RTL|LTR)(?![A-Za-z0-9]))[A-Z]{1,3}(?![A-Za-z0-9])/y,
    match => match[0],
    true,
  ),
  regexOperand(
    'variable',
    'A single lowercase Latin letter that is not part of a word: x, y, p, q, a, b.',
    /(?<![A-Za-z])[a-z](?![A-Za-z0-9])/y,
    match => match[0],
    true,
  ),
  regexOperand(
    'blank',
    'A fill-in blank inside an expression (x = ____, ∠B = ____°), kept in the same LTR run as its expression. A blank alone is not mathematics.',
    new RegExp(CLOZE_BLANK.source, 'y'),
    () => BLANK_TEX,
    false,
  ),
];

const NAMED_OPERANDS: ReadonlySet<MathOperandKind> = new Set(['variable', 'point-name', 'greek', 'script-letter']);

/** Postfix rules, tried in this order after every operand; each applies at most once. */
export const MATH_POSTFIX_RULES: readonly MathPostfixRule[] = [
  {
    name: 'subscript',
    description: 'Unicode subscript digits or _digits: ℓ₁, a₂, x_1.',
    pattern: new RegExp(`[${SUBSCRIPT_DIGITS}]+|_\\d+`, 'y'),
    appliesTo: new Set([...NAMED_OPERANDS, 'angle']),
    toTeX: match => `_{${[...match[0].replace(/^_/, '')].map(digit => {
      const position = SUBSCRIPT_DIGITS.indexOf(digit);
      return position >= 0 ? String(position) : digit;
    }).join('')}}`,
  },
  {
    name: 'prime',
    description: 'Prime marks: A\', α′, x″. An ASCII apostrophe is a prime only when it is not a closing quote (\'x\' stays quoted text).',
    pattern: /′{1,3}|(?<!'[A-Za-z0-9₀-₉]{1,3})'{1,3}(?![A-Za-z0-9])|″|‴/y,
    appliesTo: new Set([...NAMED_OPERANDS, 'angle']),
    toTeX: match => {
      const count = [...match[0]].reduce((sum, mark) => sum + (mark === '″' ? 2 : mark === '‴' ? 3 : 1), 0);
      return "'".repeat(count);
    },
  },
  {
    name: 'power',
    description: 'Exponent: x², x³, 2⁻¹, x^2, x^{10}, x^n.',
    pattern: /[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+|\^(?:\{([+\-−]?[0-9a-z]+)\}|([+\-−]?\d+)|([a-z])(?![A-Za-z0-9]))/y,
    appliesTo: new Set([...NAMED_OPERANDS, 'number', 'group']),
    toTeX: match => {
      const exponent = match[1] ?? match[2] ?? match[3] ?? [...match[0]].map(character => SUPERSCRIPT_CHARS[character] ?? '').join('');
      return `^{${exponent.replace(/−/g, '-')}}`;
    },
  },
  {
    name: 'degree',
    description: 'Degree sign attached to its value: 64°, 37.5°, x°, (4x + 6)°.',
    pattern: /°/y,
    appliesTo: new Set(['number', 'vulgar-fraction', 'variable', 'greek', 'group', 'blank']),
    toTeX: () => '^{\\circ}',
  },
];

/** Binary operators, tried in this order. The TeX of every symbol is listed in OPERATOR_TEX. */
export const MATH_OPERATOR_RULES: readonly MathOperatorRule[] = [
  { name: 'relation', description: 'Equality and order: = ≠ ≈ ≡ ≅ ∼ < > ≤ ≥ ⩽ ⩾.', pattern: /[=≠≈≡≅∼<>≤≥⩽⩾]/y, spacing: 'free', toTeX: symbol => OPERATOR_TEX[symbol] ?? symbol },
  { name: 'parallel', description: 'Parallel / not parallel: ∥ ‖ ∦.', pattern: /[∥‖∦]/y, spacing: 'free', toTeX: symbol => OPERATOR_TEX[symbol] ?? symbol },
  { name: 'perpendicular', description: 'Perpendicular: ⊥ ⟂.', pattern: /[⊥⟂]/y, spacing: 'free', toTeX: symbol => OPERATOR_TEX[symbol] ?? symbol },
  { name: 'arrow', description: 'Correspondence and implication arrows: ↔ → ⇒ ⇔.', pattern: /[↔→⇒⇔]/y, spacing: 'free', toTeX: symbol => OPERATOR_TEX[symbol] ?? symbol },
  { name: 'additive', description: 'Plus, minus sign (U+2212), plus-minus: + − ± ∓.', pattern: /[+−±∓]/y, spacing: 'free', toTeX: symbol => OPERATOR_TEX[symbol] ?? symbol },
  { name: 'hyphen-minus', description: 'ASCII hyphen used as minus, only with symmetric spacing: 2x-5, 2x - 5.', pattern: /-/y, spacing: 'symmetric', toTeX: () => '-' },
  { name: 'multiplicative', description: 'Times, dot, division: × · ⋅ ÷.', pattern: /[×·⋅÷]/y, spacing: 'free', toTeX: symbol => OPERATOR_TEX[symbol] ?? symbol },
  { name: 'ratio', description: 'Ratio between operands with symmetric spacing: 2:3, AB : CD.', pattern: /:/y, spacing: 'symmetric', toTeX: () => ':' },
  { name: 'fraction', description: 'Tight slash between two operands: a/b, 1/2, (x+1)/2 → \\frac.', pattern: /[/⁄]/y, spacing: 'tight', toTeX: () => '/' },
];

/** Which operand may directly follow which, with no space and no operator (implicit product). */
const JUXTAPOSITION: Readonly<Partial<Record<MathOperandKind, ReadonlySet<MathOperandKind>>>> = {
  'number': new Set(['variable', 'point-name', 'greek', 'script-letter', 'group', 'angle', 'vulgar-fraction']),
  'vulgar-fraction': new Set(['variable', 'greek', 'group']),
  'fraction': new Set(['variable', 'greek', 'group']),
  'variable': new Set(['group']),
  'point-name': new Set(['group']),
  'greek': new Set(['group']),
  'script-letter': new Set(['group']),
  'group': new Set(['group', 'variable', 'point-name', 'greek', 'script-letter']),
};

// ── Parser ──────────────────────────────────────────────────────────────────

function applyPostfixes(text: string, operand: Operand): Operand {
  let { end, tex, signal } = operand;
  let bareTeX = operand.bareTeX;
  const atoms = [...operand.atoms];
  let hasPower = false;
  for (const rule of MATH_POSTFIX_RULES) {
    if (!rule.appliesTo.has(operand.kind)) continue;
    const match = execAt(rule.pattern, text, end);
    if (!match) continue;
    const postfixTeX = rule.toTeX(match);
    // "x²°" would be a double superscript in TeX; brace the powered base first.
    tex = rule.name === 'degree' && hasPower ? `{${tex}}${postfixTeX}` : `${tex}${postfixTeX}`;
    bareTeX = tex;
    hasPower ||= rule.name === 'power';
    signal = true;
    end += match[0].length;
    atoms.push(atom(rule.name, match[0], postfixTeX));
  }
  return { ...operand, end, tex, bareTeX, signal, atoms };
}

function readOperand(text: string, index: number, depth: number): Operand | null {
  for (const rule of MATH_OPERAND_RULES) {
    const operand = rule.read(text, index, depth);
    if (operand) return applyPostfixes(text, operand);
  }
  return null;
}

function readGroup(text: string, index: number, depth: number): Operand | null {
  if (depth >= MAX_GROUP_DEPTH || !execAt(GROUP_OPEN, text, index)) return null;
  const members: Run[] = [];
  let cursor = index + 1;
  for (;;) {
    while (isSpace(text[cursor])) cursor += 1;
    const member = readRun(text, cursor, depth + 1, true);
    if (!member) return null;
    members.push(member);
    cursor = member.end;
    while (isSpace(text[cursor])) cursor += 1;
    if (text[cursor] === ',') {
      cursor += 1;
      continue;
    }
    if (text[cursor] !== ')') return null;
    break;
  }
  const inner = members.map(member => member.tex).join(', ');
  const end = cursor + 1;
  return {
    kind: 'group',
    end,
    tex: `(${inner})`,
    bareTeX: members.length === 1 ? inner : `(${inner})`,
    signal: members.some(member => member.signal),
    atoms: [
      atom('group', '(', '('),
      ...members.flatMap((member, position) => (position === 0 ? member.atoms : [atom('group', ',', ','), ...member.atoms])),
      atom('group', ')', ')'),
    ],
  };
}

type Term = { sign: MathAtom | null; operand: Operand };

function termTeX(term: Term) {
  return term.sign ? joinTeX(term.sign.tex, term.operand.tex) : term.operand.tex;
}

function readTerm(text: string, index: number, depth: number, allowSign: boolean): Term | null {
  if (allowSign) {
    const sign = execAt(SIGN, text, index);
    if (sign) {
      const operand = readOperand(text, index + sign[0].length, depth);
      if (operand) return { sign: atom('sign', sign[0], OPERATOR_TEX[sign[0]] ?? sign[0]), operand };
    }
  }
  const operand = readOperand(text, index, depth);
  return operand ? { sign: null, operand } : null;
}

type OperatorMatch = { rule: MathOperatorRule; symbol: string; next: number };

function readOperator(text: string, index: number): OperatorMatch | null {
  let cursor = index;
  while (isSpace(text[cursor])) cursor += 1;
  const spacesBefore = cursor - index;
  for (const rule of MATH_OPERATOR_RULES) {
    const match = execAt(rule.pattern, text, cursor);
    if (!match) continue;
    let next = cursor + match[0].length;
    const afterSymbol = next;
    while (isSpace(text[next])) next += 1;
    const spacesAfter = next - afterSymbol;
    const spacingOk =
      rule.spacing === 'free' ||
      (rule.spacing === 'symmetric' && (spacesBefore === 0) === (spacesAfter === 0)) ||
      (rule.spacing === 'tight' && spacesBefore === 0 && spacesAfter === 0);
    return spacingOk ? { rule, symbol: match[0], next } : null;
  }
  return null;
}

/**
 * Reads the longest math run that starts exactly at `start`, or returns null.
 * Whitespace is consumed only between two members of the run, never at its edges.
 */
function readRun(text: string, start: number, depth: number, allowLeadingSign: boolean): Run | null {
  const first = readTerm(text, start, depth, allowLeadingSign);
  if (!first) return null;

  const items: Array<Term | MathAtom> = [first];
  let last: Term = first;
  let end = first.operand.end;

  for (;;) {
    const juxtaposed = readOperand(text, end, depth);
    if (juxtaposed && JUXTAPOSITION[last.operand.kind]?.has(juxtaposed.kind)) {
      last = { sign: null, operand: juxtaposed };
      items.push(last);
      end = juxtaposed.end;
      continue;
    }

    const operator = readOperator(text, end);
    if (!operator) break;
    const isFraction = operator.rule.name === 'fraction';
    const next = readTerm(text, operator.next, depth, !isFraction);
    if (!next) break;

    const operatorAtom = atom(operator.rule.name, operator.symbol, operator.rule.toTeX(operator.symbol));
    if (isFraction) {
      // a/b → \frac{a}{b}; the sign of the numerator term stays in front of the fraction.
      const numerator = last.operand;
      const denominator = next.operand;
      const tex = `\\frac{${numerator.bareTeX}}{${denominator.bareTeX}}`;
      last = {
        sign: last.sign,
        operand: {
          kind: 'fraction',
          end: denominator.end,
          tex,
          bareTeX: tex,
          signal: true,
          atoms: [...numerator.atoms, operatorAtom, ...denominator.atoms],
        },
      };
      items[items.length - 1] = last;
    } else {
      items.push(operatorAtom);
      last = next;
      items.push(last);
    }
    end = next.operand.end;
  }

  let tex = '';
  let signal = false;
  const atoms: MathAtom[] = [];
  for (const item of items) {
    if ('operand' in item) {
      tex = joinTeX(tex, termTeX(item));
      signal ||= item.operand.signal || item.sign !== null;
      if (item.sign) atoms.push(item.sign);
      atoms.push(...item.operand.atoms);
    } else {
      tex = `${tex} ${item.tex} `;
      // "3-5" between plain numbers is usually a range in Hebrew prose, so an ASCII
      // hyphen alone does not make a run mathematical ("2x-5" and "5-3 = 2" still are).
      signal ||= item.rule !== 'hyphen-minus';
      atoms.push(item);
    }
  }
  return { end, tex: tex.replace(/ {2,}/g, ' ').trim(), signal, atoms };
}

/** A run may start only at a word boundary for Latin letters and digits ("x2", "U2", "top-1" stay text). */
function canStartRunAt(text: string, index: number) {
  return index === 0 || !LATIN_OR_DIGIT.test(text[index - 1] ?? '');
}

function allowsLeadingSign(text: string, index: number) {
  return index === 0 || SIGN_OPENERS.test(text[index - 1] ?? '');
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Splits `text` into text and math segments. Concatenating every segment's
 * `source` reproduces `text` exactly.
 */
export function segmentMathText(text: string): MathSegment[] {
  const segments: MathSegment[] = [];
  let textStart = 0;
  let index = 0;
  while (index < text.length) {
    const run = canStartRunAt(text, index) ? readRun(text, index, 0, allowsLeadingSign(text, index)) : null;
    if (run?.signal) {
      if (index > textStart) segments.push({ kind: 'text', source: text.slice(textStart, index) });
      segments.push({ kind: 'math', source: text.slice(index, run.end), tex: run.tex, atoms: run.atoms });
      index = run.end;
      textStart = index;
    } else {
      index += 1;
    }
  }
  if (textStart < text.length) segments.push({ kind: 'text', source: text.slice(textStart) });
  return segments;
}

/** Splits `text` into its text and math parts (the concatenation of the parts is `text`). */
export function tokenizeMathText(text: string): string[] {
  return segmentMathText(text).map(segment => segment.source);
}

/** True when the whole of `value` is exactly one math run. */
export function isMathToken(value: string): boolean {
  const segments = segmentMathText(value);
  return segments.length === 1 && segments[0]?.kind === 'math';
}

/**
 * Converts a math token (e.g. "∠ABC = 64°", "2x+10 = 3x−20") to TeX. Math runs
 * inside a longer value are converted in place; any other symbol falls back to
 * a one-to-one character mapping.
 */
export function toTeX(value: string): string {
  return segmentMathText(value)
    .map(segment => (segment.kind === 'math'
      ? segment.tex
      : [...segment.source].reduce((tex, character) => joinTeX(tex, fallbackCharacterTeX(character)), '')))
    .join('')
    .trim();
}

function fallbackCharacterTeX(character: string) {
  if (character === '∠') return '\\angle';
  if (character === '△' || character === '∆') return '\\triangle';
  if (character === 'ℓ') return '\\ell';
  if (character === '°') return '^{\\circ}';
  const subscript = SUBSCRIPT_DIGITS.indexOf(character);
  if (subscript >= 0) return `_{${subscript}}`;
  return GREEK_TEX[character] ?? OPERATOR_TEX[character] ?? character;
}

// ── MathJax runtime ─────────────────────────────────────────────────────────

type MathJaxRuntime = {
  startup?: { promise?: Promise<unknown>; typeset?: boolean };
  tex?: Record<string, unknown>;
  svg?: Record<string, unknown>;
  typesetClear?: (elements: Element[]) => void;
  typesetPromise?: (elements: Element[]) => Promise<unknown>;
};

type MathJaxWindow = Window & { MathJax?: MathJaxRuntime };

let mathJaxReady: Promise<MathJaxRuntime> | null = null;

function ensureMathJax(): Promise<MathJaxRuntime> {
  const runtime = window as MathJaxWindow;
  if (runtime.MathJax?.typesetPromise) return Promise.resolve(runtime.MathJax);
  if (mathJaxReady) return mathJaxReady;

  runtime.MathJax = {
    ...(runtime.MathJax ?? {}),
    tex: {
      inlineMath: [['\\(', '\\)']],
      processEscapes: true,
    },
    svg: {
      fontCache: 'global',
      // MathJax 4 breaks long inline math across lines by default. Inside an RTL paragraph
      // the resulting pieces are reordered (e.g. a lone "°" stranded at the end of the
      // previous line, or "180 − (5x" / "− 19)"), so every inline expression is kept atomic
      // and the paragraph wraps around it instead.
      linebreaks: { inline: false },
    },
    startup: {
      ...(runtime.MathJax?.startup ?? {}),
      typeset: false,
    },
  };

  const pending = new Promise<MathJaxRuntime>((resolve, reject) => {
    const finish = async () => {
      try {
        await runtime.MathJax?.startup?.promise;
        if (!runtime.MathJax?.typesetPromise) throw new Error('MathJax loaded without typesetPromise');
        resolve(runtime.MathJax);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    };

    const existing = document.getElementById('mathjax-script') as HTMLScriptElement | null;
    if (existing) {
      if (runtime.MathJax?.typesetPromise) {
        void finish();
      } else {
        existing.addEventListener('load', () => void finish(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Failed to load MathJax')), { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'mathjax-script';
    script.defer = true;
    script.src = new URL('vendor/mathjax/tex-svg.js', document.baseURI).toString();
    script.addEventListener('load', () => void finish(), { once: true });
    script.addEventListener('error', () => reject(new Error(`Failed to load MathJax from ${script.src}`)), { once: true });
    document.head.appendChild(script);
  });

  mathJaxReady = pending.catch(error => {
    mathJaxReady = null;
    throw error;
  });
  return mathJaxReady;
}

function MathInline({ source, tex }: { source: string; tex: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let cancelled = false;
    void ensureMathJax()
      .then(async mathJax => {
        if (cancelled || !ref.current) return;
        mathJax.typesetClear?.([ref.current]);
        await mathJax.typesetPromise?.([ref.current]);
        if (!cancelled && ref.current) ref.current.dataset.mathjax = 'svg';
      })
      .catch(error => {
        if (!cancelled) console.error('MathJax typesetting failed', error);
      });
    return () => {
      cancelled = true;
    };
  }, [tex]);

  return (
    <bdi className="math mathjax-inline" dir="ltr">
      <span ref={ref} aria-label={source}>{`\\(${tex}\\)`}</span>
    </bdi>
  );
}

/** A Hebrew prefix bound by maqaf ('ו־', 'ל־') to the expression right after it. */
const MAQAF_PREFIX = /\S*\u05BE$/u;
/** Punctuation that closes the sentence right after a formula ('∠A = ∠C.'). */
const LEADING_PUNCTUATION = /^[.,;:?!]+/;

export function MathText({ text }: { text: string }) {
  const segments = [...segmentMathText(text)];
  const nodes: React.ReactNode[] = [];
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]!;
    const next = segments[index + 1];
    const key = `${index}-${segment.source}`;
    if (segment.kind === 'math') {
      const closing = next?.kind === 'text' ? LEADING_PUNCTUATION.exec(next.source)?.[0] : undefined;
      if (closing && next) {
        nodes.push(<span className="math-unit" key={key}><MathInline source={segment.source} tex={segment.tex} />{closing}</span>);
        segments[index + 1] = { ...next, source: next.source.slice(closing.length) };
        continue;
      }
      nodes.push(<MathInline source={segment.source} tex={segment.tex} key={key} />);
      continue;
    }
    // 'ו־(3x + 42)°': the prefix and its expression form one unbreakable unit, so the prefix is
    // never left alone at the end of a line.
    const prefix = next?.kind === 'math' ? MAQAF_PREFIX.exec(segment.source)?.[0] : undefined;
    if (next?.kind === 'math' && prefix) {
      const head = segment.source.slice(0, segment.source.length - prefix.length);
      if (head) nodes.push(<React.Fragment key={key}>{head}</React.Fragment>);
      const after = segments[index + 2];
      const closing = after?.kind === 'text' ? LEADING_PUNCTUATION.exec(after.source)?.[0] : undefined;
      nodes.push(<span className="math-unit" key={`${key}-unit`}>{prefix}<MathInline source={next.source} tex={next.tex} />{closing}</span>);
      if (closing && after) segments[index + 2] = { ...after, source: after.source.slice(closing.length) };
      index += 1;
      continue;
    }
    if (!segment.source) continue;
    nodes.push(<React.Fragment key={key}>{segment.source}</React.Fragment>);
  }
  return <>{nodes}</>;
}
