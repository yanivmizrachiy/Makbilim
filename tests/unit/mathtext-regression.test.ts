/**
 * Zero-regression lock for MathText over every student-facing string of units 1–4
 * (plus the teacher guide, which renders the answer key through <MathText>).
 *
 * The ORIGINAL single-regex tokenizer is frozen below as a reference. Every corpus
 * string is tokenised by both implementations and:
 *   1. every original math token must survive inside a new math run (nothing is
 *      demoted back to plain text) — only runs are extended, merged or added;
 *   2. every new math run is Hebrew-free, trimmed, lossless and typesets to valid,
 *      faithful MathML with the real MathJax 4 TeX parser (base + ams, no silent
 *      undefined-macro fallback);
 *   3. each difference from the original is listed in the inline snapshot below,
 *      where it was reviewed one by one. A content edit that changes math
 *      tokenisation shows up here as a readable before/after diff.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { mathjax } from '@mathjax/src/js/mathjax.js';
import { TeX } from '@mathjax/src/js/input/tex.js';
import { liteAdaptor } from '@mathjax/src/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from '@mathjax/src/js/handlers/html.js';
import { STATE } from '@mathjax/src/js/core/MathItem.js';
import { SerializedMmlVisitor } from '@mathjax/src/js/core/MmlTree/SerializedMmlVisitor.js';
import '@mathjax/src/js/input/tex/base/BaseConfiguration.js';
import '@mathjax/src/js/input/tex/ams/AmsConfiguration.js';
import { isMathToken, segmentMathText, tokenizeMathText } from '../../src/components/MathText';
import { teacherAnswerKey } from '../../src/content/answer-key';
import { unit1Questions } from '../../src/content/questions-unit1';
import { unit2Questions } from '../../src/content/questions-unit2';
import { unit3Questions } from '../../src/content/questions-unit3';
import { unit4Questions } from '../../src/content/questions-unit4';

// ── Frozen reference: the original implementation (src/components/MathText.tsx @ 39bf044) ──
const legacyMathToken = /(\([^)]*[A-Za-z0-9Α-Ωα-ω][^)]*\)°?|∠[A-Za-zΑ-Ωα-ω]+(?:\s*=\s*(?:\([^)]*\)°?|\d+°))?|[A-Za-zℓ][A-Za-z0-9₁₂₃]*\s*∥\s*[A-Za-zℓ][A-Za-z0-9₁₂₃]*|\d*[xy]\s*[+\-−]\s*\d+(?:\s*=\s*[\dxy()+\-−=°\s]+)?|\b[xy]\b|\d+°|[α-ωΑ-Ω])/g;
const legacyMathTokenCheck = new RegExp(`^(?:${legacyMathToken.source})$`);
const legacyTokenizeMathText = (text: string) => text.split(legacyMathToken).filter(part => part.length > 0);
const legacyIsMathToken = (value: string) => legacyMathTokenCheck.test(value);

// ── Corpus ──────────────────────────────────────────────────────────────────
type Entry = {
  key: string;
  text: string;
  audience: 'student' | 'teacher';
  /** `MathText` when the page passes the string through <MathText>; `raw` when it prints it verbatim. */
  renderer: 'MathText' | 'raw';
};

const root = process.cwd();
const STUDENT_PAGE_FILES = [
  'src/App.tsx',
  'src/pages/Unit1Continuation.tsx',
  'src/pages/Unit2Pages.tsx',
  'src/pages/Unit3Pages.tsx',
  'src/pages/Unit4Pages.tsx',
];

/** JSX text nodes and string literals that carry Hebrew or mathematical notation. */
function literalStrings(file: string): string[] {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const found: string[] = [];
  for (const match of source.matchAll(/>([^<>{}]+)</g)) found.push((match[1] ?? '').replace(/&nbsp;/g, '\u{A0}').trim());
  for (const match of source.matchAll(/'([^'\n]*)'|"([^"\n]*)"/g)) found.push(match[1] ?? match[2] ?? '');
  return [...new Set(found.filter(text => /[\p{Script=Hebrew}∠∥°α-ω]/u.test(text)))];
}

function buildCorpus(): Entry[] {
  const entries: Entry[] = [];
  const add = (key: string, text: string | undefined, renderer: Entry['renderer'], audience: Entry['audience'] = 'student') => {
    if (text !== undefined && text !== '') entries.push({ key, text, audience, renderer });
  };

  // Unit 1 pages print their copy verbatim (App.tsx, Unit1Continuation.tsx).
  for (const q of unit1Questions) {
    add(`${q.id}.stem`, q.stem, 'raw');
    q.subparts?.forEach((text, i) => add(`${q.id}.subparts[${i}]`, text, 'raw'));
    q.choices?.forEach((text, i) => add(`${q.id}.choices[${i}]`, text, 'raw'));
  }
  // Units 2–4 mirror exactly what Unit2Pages/Unit3Pages/Unit4Pages pass to <MathText>.
  for (const q of unit2Questions) {
    add(`${q.id}.stem`, q.stem, 'MathText');
    q.choices?.forEach((text, i) => add(`${q.id}.choices[${i}]`, text, 'MathText'));
    q.tableRows?.forEach((row, i) => {
      add(`${q.id}.tableRows[${i}].label`, row.label, 'MathText');
      add(`${q.id}.tableRows[${i}].relation`, row.relation, 'raw');
      add(`${q.id}.tableRows[${i}].value`, row.value, 'MathText');
    });
  }
  for (const q of unit3Questions) {
    add(`${q.id}.stem`, q.stem, 'MathText');
    q.subparts?.forEach((text, i) => add(`${q.id}.subparts[${i}]`, text, 'MathText'));
    q.choices?.forEach((text, i) => add(`${q.id}.choices[${i}]`, text, 'MathText'));
    q.proofLines?.forEach((line, i) => {
      add(`${q.id}.proofLines[${i}].claim`, line.claim, 'MathText');
      add(`${q.id}.proofLines[${i}].reason`, line.reason, 'MathText');
    });
  }
  for (const q of unit4Questions) {
    add(`${q.id}.stem`, q.stem, 'MathText');
    q.subparts?.forEach((text, i) => add(`${q.id}.subparts[${i}]`, text, 'MathText'));
    q.choices?.forEach((text, i) => add(`${q.id}.choices[${i}]`, text, 'MathText'));
  }
  for (const file of STUDENT_PAGE_FILES) {
    for (const text of literalStrings(file)) add(`${file} literal`, text, 'raw');
  }

  // Teacher guide: TeacherApp renders every answer value and note through <MathText>.
  const walk = (key: string, value: unknown) => {
    if (typeof value === 'string') add(key, value, 'MathText', 'teacher');
    else if (typeof value === 'number' || typeof value === 'boolean') add(key, String(value), 'MathText', 'teacher');
    else if (Array.isArray(value)) value.forEach((item, i) => walk(`${key}[${i}]`, item));
    else if (value && typeof value === 'object') for (const [field, item] of Object.entries(value)) walk(`${key}.${field}`, item);
  };
  for (const entry of teacherAnswerKey) {
    walk(`teacher ${entry.id}.answer`, entry.answer);
    add(`teacher ${entry.id}.note`, entry.note, 'MathText', 'teacher');
  }
  return entries;
}

const corpus = buildCorpus();

// ── Helpers ─────────────────────────────────────────────────────────────────
type Span = { start: number; end: number; source: string };

function mathSpans(parts: ReadonlyArray<{ math: boolean; source: string }>): Span[] {
  const spans: Span[] = [];
  let offset = 0;
  for (const part of parts) {
    if (part.math) spans.push({ start: offset, end: offset + part.source.length, source: part.source });
    offset += part.source.length;
  }
  return spans;
}

const legacyParts = (text: string) => legacyTokenizeMathText(text).map(source => ({ math: legacyIsMathToken(source), source }));
const currentParts = (text: string) => segmentMathText(text).map(segment => ({ math: segment.kind === 'math', source: segment.source }));
const markup = (parts: ReadonlyArray<{ math: boolean; source: string }>) =>
  parts.map(part => (part.math ? `⟦${part.source}⟧` : part.source)).join('');

const HEBREW = /\p{Script=Hebrew}/u;
const trimmedSpan = (span: Span): Span => {
  const leading = span.source.length - span.source.trimStart().length;
  const trailing = span.source.length - span.source.trimEnd().length;
  return { start: span.start + leading, end: span.end - trailing, source: span.source.trim() };
};

// MathJax 4 TeX → MathML, exactly the parser the booklet loads (minus the
// `noundefined` fallback, so an unknown macro fails here instead of printing red).
RegisterHTMLHandler(liteAdaptor());
const texInput = new TeX({
  packages: ['base', 'ams'],
  formatError: (_jax: unknown, error: unknown) => {
    throw error instanceof Error ? error : new Error(String(error));
  },
});
const mathDocument = mathjax.document('', { InputJax: texInput });
const mmlVisitor = new SerializedMmlVisitor();
const toMathML = (tex: string): string => mmlVisitor.visitTree(mathDocument.convert(tex, { display: false, end: STATE.CONVERT }));

const decodeEntities = (value: string) =>
  value
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/** Letters, digits and key symbols in reading order — must survive source → TeX → MathML unchanged. */
const EQUIVALENT: Readonly<Record<string, string>> = { '-': '−', '⟂': '⊥', '∆': '△', 'Δ': '△', '‖': '∥' };
const faithfulSignature = (value: string) =>
  [...value.normalize('NFKD')]
    .map(character => EQUIVALENT[character] ?? character)
    .filter(character => /[A-Za-z0-9α-ωΑ-Ω∠△∥⊥=+−<>≤≥≠×÷↔]/.test(character))
    .join('');

function assertTypesetsFaithfully(source: string, tex: string) {
  const mathML = toMathML(tex);
  expect(mathML, `${source} → ${tex}`).not.toContain('merror');
  const text = decodeEntities(mathML.replace(/<[^>]+>/g, ''));
  expect(HEBREW.test(text), `${source} → Hebrew inside MathML`).toBe(false);
  expect(faithfulSignature(text), `${source} → ${tex}`).toBe(faithfulSignature(source));
}

// ── Tests ───────────────────────────────────────────────────────────────────
describe('MathText regression over the whole booklet corpus', () => {
  it('covers every original task of units 1–4 and every rendered page string', () => {
    const ids = [...unit1Questions, ...unit2Questions, ...unit3Questions, ...unit4Questions].map(q => q.id);
    expect(ids).toHaveLength(58);
    for (const id of ids) expect(corpus.some(entry => entry.key === `${id}.stem`), id).toBe(true);
    for (const file of STUDENT_PAGE_FILES) expect(corpus.some(entry => entry.key === `${file} literal`), file).toBe(true);
    expect(corpus.filter(entry => entry.audience === 'teacher').length).toBeGreaterThan(100);
  });

  it('segments every string losslessly, with trimmed Hebrew-free math runs', () => {
    for (const { key, text } of corpus) {
      const segments = segmentMathText(text);
      expect(segments.map(segment => segment.source).join(''), key).toBe(text);
      expect(tokenizeMathText(text), key).toEqual(segments.map(segment => segment.source));
      segments.forEach((segment, index) => {
        if (index > 0) expect(`${segments[index - 1]?.kind}→${segment.kind}`, key).not.toBe('text→text');
        if (segment.kind === 'text') {
          expect(isMathToken(segment.source), `${key}: text "${segment.source}"`).toBe(false);
          return;
        }
        expect(isMathToken(segment.source), `${key}: math "${segment.source}"`).toBe(true);
        expect(HEBREW.test(segment.source), `${key}: Hebrew in "${segment.source}"`).toBe(false);
        expect(segment.source, key).toBe(segment.source.trim());
        expect(segment.source, key).not.toMatch(/[.,;?!]$/);
        expect(segment.atoms.map(atom => atom.source).join('').replace(/\s/g, ''), key).toBe(segment.source.replace(/\s/g, ''));
      });
    }
  });

  it('keeps every math token of the original tokenizer inside a math run (nothing demoted to text)', () => {
    for (const { key, text } of corpus) {
      const current = mathSpans(currentParts(text));
      for (const legacy of mathSpans(legacyParts(text)).map(trimmedSpan)) {
        if (HEBREW.test(legacy.source)) continue;
        const kept = current.some(span => span.start <= legacy.start && legacy.end <= span.end);
        expect(kept, `${key}: original math "${legacy.source}" is no longer typeset`).toBe(true);
      }
    }
  });

  it('typesets every math run to valid, faithful MathML with MathJax 4', () => {
    for (const { text } of corpus) {
      for (const segment of segmentMathText(text)) {
        if (segment.kind === 'math') assertTypesetsFaithfully(segment.source, segment.tex);
      }
    }
  });

  it('typesets every supported construct to valid, faithful MathML with MathJax 4', () => {
    const gallery = [
      'x', 'y', '2x', 'ℓ₁ ∥ ℓ₂', 'AB ∥ CD', 'AB ⊥ CD', 'AB = CD', 'x ≠ 5', 'x ≤ 3', 'y ≥ 2', 'a < b', '2 × 3', '6 ÷ 2', '2 · 3',
      '½', '¾x', '1/2', 'a/b', '(x + 1)/2', '180°/2', 'x²', 'x³', 'x^2', 'x^{10}', '2⁻¹', 'x² + y² = 25', 'x²°',
      '∠A', '∠ABC', '∠1', '∠α', '∡B', '∠A₁', '∠A\'', '△ABC', '∆ABC', 'ΔABC', '∠ABC = ∠DEF', 'α\'', 'β″', 'x_1 + x_2',
      'α', 'β', 'γ', 'θ', 'ε', 'φ', 'Δ', 'Ω', '37.5°', '22½°', '2x+10 = 3x−20', '2x + 10 = 3x − 20', '180°−x', '180° − x',
      '(4x + 6)°', '(2x + 35) + (5x − 19) = 180', '3(x + 2) = 12', 'x = −5', '(−3)', '-1/2', '2x-5', '2:3', 'AB : CD',
      '∠A + ∠C = 180°', 'α + β = 90°', '∠1 ↔ ∠5', 'x = 20 ⇒ ∠A = 74°', '(2, x)',
    ];
    for (const value of gallery) {
      expect(isMathToken(value), value).toBe(true);
      const [segment] = segmentMathText(value);
      if (segment?.kind !== 'math') throw new Error(`not math: ${value}`);
      assertTypesetsFaithfully(value, segment.tex);
    }
  });

  it('matches the MathJax token count recorded by the visual baseline (reference or current tokenizer)', () => {
    const rendered = corpus.filter(entry => entry.audience === 'student' && entry.renderer === 'MathText');
    const legacyCount = rendered.reduce((sum, entry) => sum + mathSpans(legacyParts(entry.text)).length, 0);
    const currentCount = rendered.reduce((sum, entry) => sum + mathSpans(currentParts(entry.text)).length, 0);
    const baseline = JSON.parse(fs.readFileSync(path.join(root, 'qa', 'visual-baseline.json'), 'utf8')) as {
      mathJaxStatus: { total: number };
    };
    // The student booklet renders exactly these runs, so the Chromium baseline must count
    // one of the two. After the baseline is refreshed it must equal `currentCount`.
    expect([legacyCount, currentCount]).toContain(baseline.mathJaxStatus.total);
    expect({ legacyCount, currentCount }).toMatchInlineSnapshot(`
      {
        "currentCount": 180,
        "legacyCount": 167,
      }
    `);
  });

  it('lists every reviewed difference from the original tokenizer', () => {
    const differences: string[] = [];
    for (const { key, text, audience, renderer } of corpus) {
      const before = markup(legacyParts(text));
      const after = markup(currentParts(text));
      if (before === after) continue;
      const scope = renderer === 'raw' ? ' (printed verbatim, not through MathText)' : audience === 'teacher' ? ' (teacher guide)' : '';
      differences.push(`${key}${scope}\n  − ${before}\n  + ${after}`);
    }
    expect(differences.join('\n')).toMatchInlineSnapshot(`
      "U2-P1-A.stem
        − בשרטוט שלפניכם הישרים p ו־q מקבילים. נתון כי ⟦∠A = 68°⟧. חשבו את גודלה של ⟦∠B⟧.
        + בשרטוט שלפניכם הישרים ⟦p⟧ ו־⟦q⟧ מקבילים. נתון כי ⟦∠A = 68°⟧. חשבו את גודלה של ⟦∠B⟧.
      U2-P1-B.stem
        − הישרים k ו־m מקבילים. נתון כי ⟦∠C = 124°⟧. חשבו את גודלה של ⟦∠D⟧.
        + הישרים ⟦k⟧ ו־⟦m⟧ מקבילים. נתון כי ⟦∠C = 124°⟧. חשבו את גודלה של ⟦∠D⟧.
      U2-P1-C.stem
        − בשרטוט הישרים a ו־b מקבילים. נתון כי הזווית המסומנת היא ⟦47°⟧. בחרו את גודלה של הזווית המתאימה לה.
        + בשרטוט הישרים ⟦a⟧ ו־⟦b⟧ מקבילים. נתון כי הזווית המסומנת היא ⟦47°⟧. בחרו את גודלה של הזווית המתאימה לה.
      U2-P1-D.stem
        − הישרים r ו־s מקבילים. נתון כי ⟦∠E = 116°⟧. חשבו את ⟦α⟧ ונמקו.
        + הישרים ⟦r⟧ ו־⟦s⟧ מקבילים. נתון כי ⟦∠E = 116°⟧. חשבו את ⟦α⟧ ונמקו.
      U2-P2-B.stem
        − הישרים m ו־n מקבילים. נתון כי הזווית המסומנת היא ⟦137°⟧. חשבו את ⟦γ⟧.
        + הישרים ⟦m⟧ ו־⟦n⟧ מקבילים. נתון כי הזווית המסומנת היא ⟦137°⟧. חשבו את ⟦γ⟧.
      U2-P2-C.stem
        − בשרטוט הישרים c ו־d מקבילים. נתון כי ⟦∠F = 72°⟧. מצאו את ⟦δ⟧.
        + בשרטוט הישרים ⟦c⟧ ו־⟦d⟧ מקבילים. נתון כי ⟦∠F = 72°⟧. מצאו את ⟦δ⟧.
      U2-P3-B.stem
        − בשרטוט הישרים k ו־m מקבילים. נתון כי ⟦∠A = 52°⟧. היעזרו בשרטוט ובטבלה, ומצאו את גודלן של ⟦∠D⟧ ושל ⟦∠F⟧.
        + בשרטוט הישרים ⟦k⟧ ו־⟦m⟧ מקבילים. נתון כי ⟦∠A = 52°⟧. היעזרו בשרטוט ובטבלה, ומצאו את גודלן של ⟦∠D⟧ ושל ⟦∠F⟧.
      U2-P3-D.stem
        − הישרים a ו־b מקבילים ונחתכים על ידי שני ישרים שונים. נתון כי ⟦∠A = 49°⟧ ו־⟦∠C = 73°⟧. חשבו את ⟦α⟧ ואת ⟦β⟧.
        + הישרים ⟦a⟧ ו־⟦b⟧ מקבילים ונחתכים על ידי שני ישרים שונים. נתון כי ⟦∠A = 49°⟧ ו־⟦∠C = 73°⟧. חשבו את ⟦α⟧ ואת ⟦β⟧.
      U2-P4-B.stem
        − הישרים k ו־m מקבילים. שתי הזוויות המסומנות הן מתחלפות וגודליהן ⟦(3x + 17)°⟧ ו־⟦(5x − 21)°⟧. מצאו את ⟦x⟧.
        + הישרים ⟦k⟧ ו־⟦m⟧ מקבילים. שתי הזוויות המסומנות הן מתחלפות וגודליהן ⟦(3x + 17)°⟧ ו־⟦(5x − 21)°⟧. מצאו את ⟦x⟧.
      U2-P4-D.stem
        − בשרטוט הישרים r ו־s מקבילים. גודלי שתי זוויות מתחלפות הם ⟦(2x + 35)°⟧ ו־⟦(5x − 19)°⟧. בחרו את המשוואה המתאימה, נמקו ופתרו.
        + בשרטוט הישרים ⟦r⟧ ו־⟦s⟧ מקבילים. גודלי שתי זוויות מתחלפות הם ⟦(2x + 35)°⟧ ו־⟦(5x − 19)°⟧. בחרו את המשוואה המתאימה, נמקו ופתרו.
      U2-P4-D.choices[1]
        − ⟦(2x + 35)⟧ + ⟦(5x − 19)⟧ = 180
        + ⟦(2x + 35) + (5x − 19) = 180⟧
      U2-P5-B.stem
        − הישרים c ו־d מקבילים. גודלי שתי זוויות מתחלפות הם ⟦(4x + 15)°⟧ ו־⟦(2x + 63)°⟧. מצאו את ⟦x⟧ ואת גודל הזוויות.
        + הישרים ⟦c⟧ ו־⟦d⟧ מקבילים. גודלי שתי זוויות מתחלפות הם ⟦(4x + 15)°⟧ ו־⟦(2x + 63)°⟧. מצאו את ⟦x⟧ ואת גודל הזוויות.
      U2-P6-D.stem
        − הישרים k ו־m מקבילים ונחתכים על ידי שני ישרים. נתון כי ⟦∠A = 41°⟧ ו־⟦∠C = 68°⟧. ⟦α⟧ מתאימה ל־⟦∠A⟧, ו־⟦β⟧ צמודה לזווית המתאימה ל־⟦∠C⟧. חשבו את ⟦α⟧ + ⟦β⟧ ונמקו בקצרה את שלבי החישוב.
        + הישרים ⟦k⟧ ו־⟦m⟧ מקבילים ונחתכים על ידי שני ישרים. נתון כי ⟦∠A = 41°⟧ ו־⟦∠C = 68°⟧. ⟦α⟧ מתאימה ל־⟦∠A⟧, ו־⟦β⟧ צמודה לזווית המתאימה ל־⟦∠C⟧. חשבו את ⟦α + β⟧ ונמקו בקצרה את שלבי החישוב.
      U3-P1-A.stem
        − בשרטוט ⟦p ∥ q⟧. בחרו את הנימוק המתאים לטענה ⟦∠A⟧ = ⟦∠B⟧.
        + בשרטוט ⟦p ∥ q⟧. בחרו את הנימוק המתאים לטענה ⟦∠A = ∠B⟧.
      U3-P1-B.proofLines[1].claim
        − ⟦∠C⟧ = ⟦∠D⟧
        + ⟦∠C = ∠D⟧
      U3-P1-C.subparts[0]
        − ⟦∠A⟧ = ⟦∠B⟧
        + ⟦∠A = ∠B⟧
      U3-P1-C.subparts[1]
        − ⟦∠C⟧ = ⟦∠D⟧
        + ⟦∠C = ∠D⟧
      U3-P1-C.subparts[2]
        − ⟦∠E⟧ = ⟦∠F⟧
        + ⟦∠E = ∠F⟧
      U3-P1-D.stem
        − בשרטוט ⟦a ∥ b⟧. קבעו אם ⟦∠A⟧ = ⟦∠C⟧. נמקו את קביעתכם.
        + בשרטוט ⟦a ∥ b⟧. קבעו אם ⟦∠A = ∠C⟧. נמקו את קביעתכם.
      U3-P2-A.stem
        − בשרטוט ⟦p ∥ q⟧. תלמיד כתב: „⟦∠A⟧ = ⟦∠B⟧ כי הן זוויות מתאימות בין ישרים מקבילים”. מצאו את הטעות בנימוק ותקנו אותו.
        + בשרטוט ⟦p ∥ q⟧. תלמיד כתב: „⟦∠A = ∠B⟧ כי הן זוויות מתאימות בין ישרים מקבילים”. מצאו את הטעות בנימוק ותקנו אותו.
      U3-P2-B.proofLines[0].claim
        − ⟦∠A⟧ = ⟦∠C⟧
        + ⟦∠A = ∠C⟧
      U3-P2-B.proofLines[1].claim
        − ⟦∠A⟧ = ⟦∠B⟧
        + ⟦∠A = ∠B⟧
      U3-P2-B.proofLines[2].claim
        − ⟦∠B⟧ = ⟦∠C⟧
        + ⟦∠B = ∠C⟧
      U3-P2-C.proofLines[2].claim
        − ⟦∠B⟧ = ⟦∠C⟧
        + ⟦∠B = ∠C⟧
      U3-P2-C.proofLines[3].claim
        − ⟦∠A⟧ = ⟦∠C⟧
        + ⟦∠A = ∠C⟧
      U3-P2-D.stem
        − המטרה היא להוכיח כי ⟦∠A⟧ = ⟦∠B⟧. איזה מן הנתונים שלהלן מספיק לבדו כדי להוכיח זאת? נמקו.
        + המטרה היא להוכיח כי ⟦∠A = ∠B⟧. איזה מן הנתונים שלהלן מספיק לבדו כדי להוכיח זאת? נמקו.
      U3-P2-D.choices[3]
        − הישר s חותך את הישרים p ו־q
        + הישר ⟦s⟧ חותך את הישרים ⟦p⟧ ו־⟦q⟧
      U3-P3-A.stem
        − נתון ⟦p ∥ q⟧. הוכיחו כי ⟦∠A⟧ = ⟦∠C⟧.
        + נתון ⟦p ∥ q⟧. הוכיחו כי ⟦∠A = ∠C⟧.
      U3-P3-B.stem
        − נתון ⟦k ∥ m⟧. הוכיחו כי ⟦∠A⟧ + ⟦∠C = 180°⟧.
        + נתון ⟦k ∥ m⟧. הוכיחו כי ⟦∠A + ∠C = 180°⟧.
      U3-P3-C.stem
        − נתון ⟦a ∥ b⟧ וכן ⟦∠E = 35°⟧. הוכיחו כי ⟦∠A⟧ = ⟦∠D⟧. קבעו אם הנתון ⟦∠E = 35°⟧ נחוץ להוכחה, ונמקו.
        + נתון ⟦a ∥ b⟧ וכן ⟦∠E = 35°⟧. הוכיחו כי ⟦∠A = ∠D⟧. קבעו אם הנתון ⟦∠E = 35°⟧ נחוץ להוכחה, ונמקו.
      U3-P3-D.stem
        − נתון ⟦p ∥ q⟧. שני תלמידים כתבו הוכחה לטענה ⟦∠A⟧ = ⟦∠C⟧. קבעו איזו הוכחה נכונה ונמקו.
        + נתון ⟦p ∥ q⟧. שני תלמידים כתבו הוכחה לטענה ⟦∠A = ∠C⟧. קבעו איזו הוכחה נכונה ונמקו.
      U3-P3-D.subparts[0]
        − הוכחה א: ⟦∠A⟧ = ⟦∠B⟧ כי הן זוויות מתאימות בין הישרים המקבילים p ו־q; ⟦∠B⟧ = ⟦∠C⟧ כי הן זוויות קודקודיות; לכן ⟦∠A⟧ = ⟦∠C⟧.
        + הוכחה א: ⟦∠A = ∠B⟧ כי הן זוויות מתאימות בין הישרים המקבילים ⟦p⟧ ו־⟦q⟧; ⟦∠B = ∠C⟧ כי הן זוויות קודקודיות; לכן ⟦∠A = ∠C⟧.
      U3-P3-D.subparts[1]
        − הוכחה ב: ⟦∠A⟧ = ⟦∠C⟧ כי שתיהן זוויות מתחלפות, ולכן הן שוות.
        + הוכחה ב: ⟦∠A = ∠C⟧ כי שתיהן זוויות מתחלפות, ולכן הן שוות.
      U4-P2-B.stem
        − באיזה מן המקרים אפשר לקבוע שהישרים p ו־q מקבילים? בחרו ונמקו.
        + באיזה מן המקרים אפשר לקבוע שהישרים ⟦p⟧ ו־⟦q⟧ מקבילים? בחרו ונמקו.
      U4-P2-B.choices[0]
        − זוג זוויות מתאימות בין p ו־q שוות זו לזו.
        + זוג זוויות מתאימות בין ⟦p⟧ ו־⟦q⟧ שוות זו לזו.
      U4-P2-C.stem
        − הישרים p ו־q נחתכים על ידי ישר שלישי. גודלי שתי זוויות מתאימות הם ⟦(3x + 14)°⟧ ו־⟦(5x − 26)°⟧. מצאו את ⟦x⟧ כך שניתן יהיה לקבוע כי ⟦p ∥ q⟧. נמקו.
        + הישרים ⟦p⟧ ו־⟦q⟧ נחתכים על ידי ישר שלישי. גודלי שתי זוויות מתאימות הם ⟦(3x + 14)°⟧ ו־⟦(5x − 26)°⟧. מצאו את ⟦x⟧ כך שניתן יהיה לקבוע כי ⟦p ∥ q⟧. נמקו.
      U4-P2-D.stem
        − נתון ⟦p ∥ q⟧. בשרטוט ⟦∠A⟧ מתאימה ל־⟦∠B⟧, ונתון גם כי ⟦∠A⟧ = ⟦∠C⟧. הזוויות ⟦∠B⟧ ו־⟦∠C⟧ מתאימות ביחס לישרים q ו־r. הוכיחו כי ⟦q ∥ r⟧.
        + נתון ⟦p ∥ q⟧. בשרטוט ⟦∠A⟧ מתאימה ל־⟦∠B⟧, ונתון גם כי ⟦∠A = ∠C⟧. הזוויות ⟦∠B⟧ ו־⟦∠C⟧ מתאימות ביחס לישרים ⟦q⟧ ו־⟦r⟧. הוכיחו כי ⟦q ∥ r⟧.
      src/pages/Unit1Continuation.tsx literal (printed verbatim, not through MathText)
        − ∠1
        + ⟦∠1⟧
      src/pages/Unit1Continuation.tsx literal (printed verbatim, not through MathText)
        − ∠2
        + ⟦∠2⟧
      src/pages/Unit1Continuation.tsx literal (printed verbatim, not through MathText)
        − ∠3
        + ⟦∠3⟧
      src/pages/Unit1Continuation.tsx literal (printed verbatim, not through MathText)
        − ∠4
        + ⟦∠4⟧
      src/pages/Unit1Continuation.tsx literal (printed verbatim, not through MathText)
        − ∠5
        + ⟦∠5⟧
      src/pages/Unit1Continuation.tsx literal (printed verbatim, not through MathText)
        − ∠6
        + ⟦∠6⟧
      src/pages/Unit1Continuation.tsx literal (printed verbatim, not through MathText)
        − ∠7
        + ⟦∠7⟧
      src/pages/Unit1Continuation.tsx literal (printed verbatim, not through MathText)
        − ∠8
        + ⟦∠8⟧
      src/pages/Unit4Pages.tsx literal (printed verbatim, not through MathText)
        − שלושה ישרים p, q, r וישר חותך; p ו־q מסומנים כמקבילים
        + שלושה ישרים ⟦p⟧, ⟦q⟧, ⟦r⟧ וישר חותך; ⟦p⟧ ו־⟦q⟧ מסומנים כמקבילים
      teacher U1-P1-A.answer (teacher guide)
        − הישר r הוא הישר החותך.
        + הישר ⟦r⟧ הוא הישר החותך.
      teacher U1-P1-E.answer[0] (teacher guide)
        − ∠1 ↔ ∠5
        + ⟦∠1 ↔ ∠5⟧
      teacher U1-P1-E.answer[1] (teacher guide)
        − ∠2 ↔ ∠6
        + ⟦∠2 ↔ ∠6⟧
      teacher U1-P1-E.answer[2] (teacher guide)
        − ∠3 ↔ ∠7
        + ⟦∠3 ↔ ∠7⟧
      teacher U1-P1-E.answer[3] (teacher guide)
        − ∠4 ↔ ∠8
        + ⟦∠4 ↔ ∠8⟧
      teacher U1-P2-A.answer[0] (teacher guide)
        − ∠1 ↔ ∠7
        + ⟦∠1 ↔ ∠7⟧
      teacher U1-P2-A.answer[1] (teacher guide)
        − ∠2 ↔ ∠8
        + ⟦∠2 ↔ ∠8⟧
      teacher U1-P2-A.answer[2] (teacher guide)
        − ∠3 ↔ ∠5
        + ⟦∠3 ↔ ∠5⟧
      teacher U1-P2-A.answer[3] (teacher guide)
        − ∠4 ↔ ∠6
        + ⟦∠4 ↔ ∠6⟧
      teacher U1-P2-B.answer[0] (teacher guide)
        − דוגמה לזוג מתאימות: ∠1 ו־∠5.
        + דוגמה לזוג מתאימות: ⟦∠1⟧ ו־⟦∠5⟧.
      teacher U1-P2-B.answer[1] (teacher guide)
        − דוגמה לזוג מתחלפות: ∠1 ו־∠7.
        + דוגמה לזוג מתחלפות: ⟦∠1⟧ ו־⟦∠7⟧.
      teacher U2-P5-D.answer.justification (teacher guide)
        − הזוויות צמודות על ישר ולכן סכומן ⟦180°⟧; המשוואה הנכונה היא ⟦(2x + 20)⟧ + ⟦(3x + 35)⟧ = 180.
        + הזוויות צמודות על ישר ולכן סכומן ⟦180°⟧; המשוואה הנכונה היא ⟦(2x + 20) + (3x + 35) = 180⟧.
      teacher U3-P1-A.note (teacher guide)
        − הזוויות ⟦∠A⟧ ו־⟦∠B⟧ הן זוויות מתאימות, והישרים p ו־q מקבילים. הנימוק „זוויות מתאימות שוות.” חסר את תנאי המקבילות ולכן אינו נכון.
        + הזוויות ⟦∠A⟧ ו־⟦∠B⟧ הן זוויות מתאימות, והישרים ⟦p⟧ ו־⟦q⟧ מקבילים. הנימוק „זוויות מתאימות שוות.” חסר את תנאי המקבילות ולכן אינו נכון.
      teacher U3-P1-C.answer.proof[0] (teacher guide)
        − ⟦∠A⟧ = ⟦∠B⟧ — זוויות מתאימות בין ישרים מקבילים שוות.
        + ⟦∠A = ∠B⟧ — זוויות מתאימות בין ישרים מקבילים שוות.
      teacher U3-P1-C.answer.proof[1] (teacher guide)
        − ⟦∠C⟧ = ⟦∠D⟧ — זוויות מתחלפות בין ישרים מקבילים שוות.
        + ⟦∠C = ∠D⟧ — זוויות מתחלפות בין ישרים מקבילים שוות.
      teacher U3-P1-C.answer.proof[2] (teacher guide)
        − ⟦∠E⟧ = ⟦∠F⟧ — זוויות קודקודיות שוות.
        + ⟦∠E = ∠F⟧ — זוויות קודקודיות שוות.
      teacher U3-P1-D.answer.conclusion (teacher guide)
        − כן, ⟦∠A⟧ = ⟦∠C⟧.
        + כן, ⟦∠A = ∠C⟧.
      teacher U3-P1-D.answer.proof[0] (teacher guide)
        − ⟦∠A⟧ = ⟦∠B⟧ — זוויות מתאימות בין ישרים מקבילים שוות.
        + ⟦∠A = ∠B⟧ — זוויות מתאימות בין ישרים מקבילים שוות.
      teacher U3-P1-D.answer.proof[1] (teacher guide)
        − ⟦∠B⟧ = ⟦∠C⟧ — זוויות קודקודיות שוות.
        + ⟦∠B = ∠C⟧ — זוויות קודקודיות שוות.
      teacher U3-P1-D.answer.proof[2] (teacher guide)
        − ⟦∠A⟧ = ⟦∠C⟧ — מכלל המעבר.
        + ⟦∠A = ∠C⟧ — מכלל המעבר.
      teacher U3-P1-D.note (teacher guide)
        − גם נימוק בשלב אחד נכון, כי ⟦∠A⟧ ו־⟦∠C⟧ הן זוויות מתחלפות: ⟦∠A⟧ = ⟦∠C⟧ — זוויות מתחלפות בין ישרים מקבילים שוות. שתי הדרכים מתקבלות.
        + גם נימוק בשלב אחד נכון, כי ⟦∠A⟧ ו־⟦∠C⟧ הן זוויות מתחלפות: ⟦∠A = ∠C⟧ — זוויות מתחלפות בין ישרים מקבילים שוות. שתי הדרכים מתקבלות.
      teacher U3-P2-A.answer.reason[1] (teacher guide)
        − נימוק מתוקן: ⟦∠A⟧ = ⟦∠B⟧ כי זוויות מתחלפות בין ישרים מקבילים שוות.
        + נימוק מתוקן: ⟦∠A = ∠B⟧ כי זוויות מתחלפות בין ישרים מקבילים שוות.
      teacher U3-P2-B.answer.proof[1] (teacher guide)
        − ⟦∠A⟧ = ⟦∠B⟧ — זוויות מתאימות בין ישרים מקבילים שוות.
        + ⟦∠A = ∠B⟧ — זוויות מתאימות בין ישרים מקבילים שוות.
      teacher U3-P2-B.answer.proof[2] (teacher guide)
        − ⟦∠B⟧ = ⟦∠C⟧ — זוויות קודקודיות שוות.
        + ⟦∠B = ∠C⟧ — זוויות קודקודיות שוות.
      teacher U3-P2-B.answer.proof[3] (teacher guide)
        − ⟦∠A⟧ = ⟦∠C⟧ — מכלל המעבר.
        + ⟦∠A = ∠C⟧ — מכלל המעבר.
      teacher U3-P2-B.answer.reason[0] (teacher guide)
        − השורה ⟦p ∥ q⟧ חייבת להופיע לפני השורה ⟦∠A⟧ = ⟦∠B⟧, והשורה ⟦∠A⟧ = ⟦∠C⟧ היא האחרונה. השורה ⟦∠B⟧ = ⟦∠C⟧ יכולה להופיע בכל מקום לפני האחרונה.
        + השורה ⟦p ∥ q⟧ חייבת להופיע לפני השורה ⟦∠A = ∠B⟧, והשורה ⟦∠A = ∠C⟧ היא האחרונה. השורה ⟦∠B = ∠C⟧ יכולה להופיע בכל מקום לפני האחרונה.
      teacher U3-P2-C.answer.reason (teacher guide)
        − השורה החסרה: ⟦∠A⟧ = ⟦∠B⟧.
        + השורה החסרה: ⟦∠A = ∠B⟧.
      teacher U3-P2-D.answer.reason[0] (teacher guide)
        − הנתון ⟦p ∥ q⟧ מספיק: ⟦∠A⟧ ו־⟦∠B⟧ הן זוויות מתאימות ביחס לישרים p ו־q והחותך r, ולפי המשפט „זוויות מתאימות בין ישרים מקבילים שוות.” הן שוות.
        + הנתון ⟦p ∥ q⟧ מספיק: ⟦∠A⟧ ו־⟦∠B⟧ הן זוויות מתאימות ביחס לישרים ⟦p⟧ ו־⟦q⟧ והחותך ⟦r⟧, ולפי המשפט „זוויות מתאימות בין ישרים מקבילים שוות.” הן שוות.
      teacher U3-P2-D.answer.reason[1] (teacher guide)
        − הנתון ⟦r ∥ s⟧ אינו עוזר: הזוויות נוצרות בחיתוך הישר r עם p ועם q, ולכן נדרשת מקבילות של p ו־q.
        + הנתון ⟦r ∥ s⟧ אינו עוזר: הזוויות נוצרות בחיתוך הישר ⟦r⟧ עם ⟦p⟧ ועם ⟦q⟧, ולכן נדרשת מקבילות של ⟦p⟧ ו־⟦q⟧.
      teacher U3-P2-D.answer.reason[2] (teacher guide)
        − עצם היותן של הזוויות מתאימות אינו מבטיח שוויון בלי נתון המקבילות, והעובדה שהישר s חותך את p ואת q אינה קשורה לזוויות ⟦∠A⟧ ו־⟦∠B⟧.
        + עצם היותן של הזוויות מתאימות אינו מבטיח שוויון בלי נתון המקבילות, והעובדה שהישר ⟦s⟧ חותך את ⟦p⟧ ואת ⟦q⟧ אינה קשורה לזוויות ⟦∠A⟧ ו־⟦∠B⟧.
      teacher U3-P3-A.answer.proof[0] (teacher guide)
        − ⟦∠A⟧ = ⟦∠B⟧ — זוויות מתאימות בין ישרים מקבילים שוות.
        + ⟦∠A = ∠B⟧ — זוויות מתאימות בין ישרים מקבילים שוות.
      teacher U3-P3-A.answer.proof[1] (teacher guide)
        − ⟦∠B⟧ = ⟦∠C⟧ — זוויות קודקודיות שוות.
        + ⟦∠B = ∠C⟧ — זוויות קודקודיות שוות.
      teacher U3-P3-A.answer.proof[2] (teacher guide)
        − ⟦∠A⟧ = ⟦∠C⟧ — מכלל המעבר.
        + ⟦∠A = ∠C⟧ — מכלל המעבר.
      teacher U3-P3-A.note (teacher guide)
        − גם הוכחה בשלב אחד נכונה, כי ⟦∠A⟧ ו־⟦∠C⟧ הן זוויות מתחלפות: ⟦∠A⟧ = ⟦∠C⟧ — זוויות מתחלפות בין ישרים מקבילים שוות. שתי הדרכים מתקבלות.
        + גם הוכחה בשלב אחד נכונה, כי ⟦∠A⟧ ו־⟦∠C⟧ הן זוויות מתחלפות: ⟦∠A = ∠C⟧ — זוויות מתחלפות בין ישרים מקבילים שוות. שתי הדרכים מתקבלות.
      teacher U3-P3-B.answer.proof[0] (teacher guide)
        − ⟦∠A⟧ = ⟦∠B⟧ — זוויות מתחלפות בין ישרים מקבילים שוות.
        + ⟦∠A = ∠B⟧ — זוויות מתחלפות בין ישרים מקבילים שוות.
      teacher U3-P3-B.answer.proof[1] (teacher guide)
        − ⟦∠B⟧ + ⟦∠C = 180°⟧ — זוויות צמודות משלימות ל־⟦180°⟧.
        + ⟦∠B + ∠C = 180°⟧ — זוויות צמודות משלימות ל־⟦180°⟧.
      teacher U3-P3-B.answer.proof[2] (teacher guide)
        − לכן ⟦∠A⟧ + ⟦∠C = 180°⟧.
        + לכן ⟦∠A + ∠C = 180°⟧.
      teacher U3-P3-C.answer.proof[0] (teacher guide)
        − ⟦∠A⟧ = ⟦∠B⟧ — זוויות מתאימות בין ישרים מקבילים שוות.
        + ⟦∠A = ∠B⟧ — זוויות מתאימות בין ישרים מקבילים שוות.
      teacher U3-P3-C.answer.proof[1] (teacher guide)
        − ⟦∠B⟧ = ⟦∠D⟧ — זוויות קודקודיות שוות.
        + ⟦∠B = ∠D⟧ — זוויות קודקודיות שוות.
      teacher U3-P3-C.answer.proof[2] (teacher guide)
        − ⟦∠A⟧ = ⟦∠D⟧ — מכלל המעבר.
        + ⟦∠A = ∠D⟧ — מכלל המעבר.
      teacher U3-P3-C.answer.reason (teacher guide)
        − הנתון ⟦∠E = 35°⟧ אינו נחוץ להוכחה: ⟦∠E⟧ נמצאת על הישר s, וההוכחה משתמשת רק בנתון ⟦a ∥ b⟧ ובזוויות שעל הישר r.
        + הנתון ⟦∠E = 35°⟧ אינו נחוץ להוכחה: ⟦∠E⟧ נמצאת על הישר ⟦s⟧, וההוכחה משתמשת רק בנתון ⟦a ∥ b⟧ ובזוויות שעל הישר ⟦r⟧.
      teacher U3-P3-C.note (teacher guide)
        − גם הוכחה בשלב אחד נכונה, כי ⟦∠A⟧ ו־⟦∠D⟧ הן זוויות מתחלפות: ⟦∠A⟧ = ⟦∠D⟧ — זוויות מתחלפות בין ישרים מקבילים שוות. שתי הדרכים מתקבלות, ובשתיהן הנתון ⟦∠E = 35°⟧ אינו נחוץ.
        + גם הוכחה בשלב אחד נכונה, כי ⟦∠A⟧ ו־⟦∠D⟧ הן זוויות מתחלפות: ⟦∠A = ∠D⟧ — זוויות מתחלפות בין ישרים מקבילים שוות. שתי הדרכים מתקבלות, ובשתיהן הנתון ⟦∠E = 35°⟧ אינו נחוץ.
      teacher U3-P3-D.answer.reason[0] (teacher guide)
        − הוכחה א נכונה: ⟦∠A⟧ = ⟦∠B⟧ כי הן זוויות מתאימות בין הישרים המקבילים p ו־q, ו־⟦∠B⟧ = ⟦∠C⟧ כי הן זוויות קודקודיות.
        + הוכחה א נכונה: ⟦∠A = ∠B⟧ כי הן זוויות מתאימות בין הישרים המקבילים ⟦p⟧ ו־⟦q⟧, ו־⟦∠B = ∠C⟧ כי הן זוויות קודקודיות.
      teacher U3-P3-D.answer.reason[1] (teacher guide)
        − הוכחה ב אינה נכונה כפי שנכתבה. הזוויות ⟦∠A⟧ ו־⟦∠C⟧ אכן מתחלפות, אבל עצם היותן מתחלפות אינו מבטיח שהן שוות: המשפט הוא „זוויות מתחלפות בין ישרים מקבילים שוות.”, ובהוכחה ב לא נעשה שימוש בנתון שהישרים p ו־q מקבילים.
        + הוכחה ב אינה נכונה כפי שנכתבה. הזוויות ⟦∠A⟧ ו־⟦∠C⟧ אכן מתחלפות, אבל עצם היותן מתחלפות אינו מבטיח שהן שוות: המשפט הוא „זוויות מתחלפות בין ישרים מקבילים שוות.”, ובהוכחה ב לא נעשה שימוש בנתון שהישרים ⟦p⟧ ו־⟦q⟧ מקבילים.
      teacher U3-P3-D.answer.reason[2] (teacher guide)
        − תיקון להוכחה ב: ⟦∠A⟧ = ⟦∠C⟧ כי הן זוויות מתחלפות בין הישרים המקבילים p ו־q.
        + תיקון להוכחה ב: ⟦∠A = ∠C⟧ כי הן זוויות מתחלפות בין הישרים המקבילים ⟦p⟧ ו־⟦q⟧.
      teacher U4-P2-B.answer.choice (teacher guide)
        − זוג זוויות מתאימות בין p ו־q שוות זו לזו.
        + זוג זוויות מתאימות בין ⟦p⟧ ו־⟦q⟧ שוות זו לזו.
      teacher U4-P2-C.answer.justification (teacher guide)
        − כדי לקבוע שהישרים p ו־q מקבילים באמצעות המשפט ההפוך, משווים את שתי הזוויות הנתונות: ⟦3x + 14 = 5x − 26⟧. כאשר הן שוות מתקבל ⟦x⟧ = 20, ולכן ניתן להסיק ⟦p ∥ q⟧.
        + כדי לקבוע שהישרים ⟦p⟧ ו־⟦q⟧ מקבילים באמצעות המשפט ההפוך, משווים את שתי הזוויות הנתונות: ⟦3x + 14 = 5x − 26⟧. כאשר הן שוות מתקבל ⟦x = 20⟧, ולכן ניתן להסיק ⟦p ∥ q⟧.
      teacher U4-P2-C.answer.reason[1] (teacher guide)
        − ⟦3x + 14 = 5x − 26⟧, ולכן ⟦x⟧ = 20.
        + ⟦3x + 14 = 5x − 26⟧, ולכן ⟦x = 20⟧.
      teacher U4-P2-C.answer.reason[2] (teacher guide)
        − עבור ⟦x⟧ = 20 שתי הזוויות שוות ל־⟦74°⟧, ולכן ⟦p ∥ q⟧.
        + עבור ⟦x = 20⟧ שתי הזוויות שוות ל־⟦74°⟧, ולכן ⟦p ∥ q⟧.
      teacher U4-P2-D.answer.proof[0] (teacher guide)
        − ⟦∠A⟧ = ⟦∠B⟧ — זוויות מתאימות בין הישרים המקבילים p ו־q שוות זו לזו.
        + ⟦∠A = ∠B⟧ — זוויות מתאימות בין הישרים המקבילים ⟦p⟧ ו־⟦q⟧ שוות זו לזו.
      teacher U4-P2-D.answer.proof[1] (teacher guide)
        − ⟦∠A⟧ = ⟦∠C⟧ — נתון.
        + ⟦∠A = ∠C⟧ — נתון.
      teacher U4-P2-D.answer.proof[2] (teacher guide)
        − לכן ⟦∠B⟧ = ⟦∠C⟧ — מכלל המעבר.
        + לכן ⟦∠B = ∠C⟧ — מכלל המעבר.
      teacher U4-P2-D.answer.proof[3] (teacher guide)
        − ⟦∠B⟧ ו־⟦∠C⟧ הן זוויות מתאימות ביחס לישרים q ו־r.
        + ⟦∠B⟧ ו־⟦∠C⟧ הן זוויות מתאימות ביחס לישרים ⟦q⟧ ו־⟦r⟧."
    `);
  });
});
