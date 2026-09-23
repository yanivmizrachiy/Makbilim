/**
 * Diagram label typography.
 *
 * Diagram labels are set in the SAME typeface MathJax uses for the question text (New Computer
 * Modern, the unmodified `mjx-ncm-n` / `mjx-ncm-s` faces of @mathjax/mathjax-newcm-font, which
 * @mathjax/src pins exactly), so p, q, t, A, α and x read in the drawing exactly as in the stem:
 * letters in math italic, digits, brackets, operators and ° upright. The face is loaded offline
 * from the app bundle (geometry-premium.css), never from a CDN.
 *
 * Placement never measures the DOM: every label box comes from the font's own metrics below
 * (advance width and ink extent per glyph, in 1/1000 em, read from the font file), so layout is
 * deterministic and identical in tests, on screen and in print.
 */

/** [advance, ink yMin, ink yMax] per code point, 1/1000 em (y up, baseline = 0). */
const GLYPHS: Readonly<Record<number, readonly [number, number, number]>> = {
  0x20: [332, 0, 0],
  0x28: [389, -248, 748],
  0x29: [389, -248, 748],
  0x2b: [778, -83, 583],
  0x2c: [278, -193, 106],
  0x2e: [278, 0, 106],
  0x30: [500, -22, 666],
  0x31: [500, 0, 666],
  0x32: [500, 0, 666],
  0x33: [500, -22, 666],
  0x34: [500, 0, 677],
  0x35: [500, -22, 666],
  0x36: [500, -22, 666],
  0x37: [500, -22, 676],
  0x38: [500, -22, 666],
  0x39: [500, -22, 666],
  0x3d: [778, 133, 367],
  0x3f: [472, 0, 705],
  0x41: [750, 0, 716],
  0x42: [708, 0, 683],
  0x43: [722, -22, 705],
  0x44: [764, 0, 683],
  0x45: [681, 0, 680],
  0x46: [653, 0, 680],
  0x47: [785, -22, 705],
  0x48: [750, 0, 683],
  0x49: [361, 0, 683],
  0x4a: [514, -22, 683],
  0x4b: [778, 0, 683],
  0x4c: [625, 0, 683],
  0x4d: [917, 0, 683],
  0x4e: [750, 0, 683],
  0x4f: [778, -22, 705],
  0x50: [681, 0, 683],
  0x51: [778, -194, 705],
  0x52: [736, -22, 683],
  0x53: [556, -22, 705],
  0x54: [722, 0, 677],
  0x55: [750, -22, 683],
  0x56: [750, -22, 683],
  0x57: [1028, -22, 683],
  0x58: [750, 0, 683],
  0x59: [750, 0, 683],
  0x5a: [611, 0, 683],
  0x61: [500, -11, 448],
  0x62: [556, -11, 694],
  0x63: [444, -11, 448],
  0x64: [556, -11, 694],
  0x65: [444, -11, 448],
  0x66: [306, 0, 705],
  0x67: [500, -206, 453],
  0x68: [556, 0, 694],
  0x69: [278, 0, 657],
  0x6a: [306, -205, 657],
  0x6b: [528, 0, 694],
  0x6c: [278, 0, 694],
  0x6d: [833, 0, 442],
  0x6e: [556, 0, 442],
  0x6f: [500, -11, 448],
  0x70: [556, -194, 442],
  0x71: [528, -194, 442],
  0x72: [392, 0, 442],
  0x73: [394, -11, 448],
  0x74: [389, -11, 615],
  0x75: [556, -11, 442],
  0x76: [528, -11, 431],
  0x77: [722, -11, 431],
  0x78: [528, 0, 431],
  0x79: [528, -205, 431],
  0x7a: [444, 0, 431],
  0xb0: [375, 406, 683],
  0x2032: [311, 430, 748],
  0x205f: [222, 0, 0],
  0x210e: [576, -11, 694],
  0x2113: [417, -12, 705],
  0x2212: [778, 230, 270],
  0x1d434: [750, 0, 716],
  0x1d435: [759, 0, 683],
  0x1d436: [715, -22, 705],
  0x1d437: [828, 0, 683],
  0x1d438: [738, 0, 680],
  0x1d439: [643, 0, 680],
  0x1d43a: [786, -22, 705],
  0x1d43b: [831, 0, 683],
  0x1d43c: [440, 0, 683],
  0x1d43d: [555, -22, 683],
  0x1d43e: [849, 0, 683],
  0x1d43f: [681, 0, 683],
  0x1d440: [970, 0, 683],
  0x1d441: [803, 0, 683],
  0x1d442: [763, -22, 705],
  0x1d443: [642, 0, 683],
  0x1d444: [791, -194, 705],
  0x1d445: [759, -22, 683],
  0x1d446: [613, -22, 705],
  0x1d447: [584, 0, 677],
  0x1d448: [683, -22, 683],
  0x1d449: [583, -22, 683],
  0x1d44a: [944, -22, 683],
  0x1d44b: [828, 0, 683],
  0x1d44c: [581, 0, 683],
  0x1d44d: [683, 0, 683],
  0x1d44e: [529, -11, 442],
  0x1d44f: [429, -11, 694],
  0x1d450: [433, -11, 442],
  0x1d451: [520, -11, 694],
  0x1d452: [466, -11, 442],
  0x1d453: [490, -205, 705],
  0x1d454: [477, -205, 442],
  0x1d456: [345, -11, 661],
  0x1d457: [412, -205, 661],
  0x1d458: [521, -11, 694],
  0x1d459: [298, -11, 694],
  0x1d45a: [878, -11, 442],
  0x1d45b: [600, -11, 442],
  0x1d45c: [485, -11, 442],
  0x1d45d: [503, -194, 442],
  0x1d45e: [446, -194, 442],
  0x1d45f: [451, -11, 442],
  0x1d460: [469, -11, 442],
  0x1d461: [361, -11, 626],
  0x1d462: [572, -11, 442],
  0x1d463: [485, -11, 442],
  0x1d464: [716, -11, 442],
  0x1d465: [572, -11, 442],
  0x1d466: [490, -205, 442],
  0x1d467: [465, -11, 442],
  0x1d6fc: [640, -11, 442],
  0x1d6fd: [566, -194, 706],
  0x1d6fe: [518, -215, 442],
  0x1d6ff: [444, -11, 712],
  0x1d700: [466, -22, 453],
  0x1d701: [438, -205, 697],
  0x1d702: [497, -216, 442],
  0x1d703: [469, -11, 705],
  0x1d704: [354, -11, 442],
  0x1d705: [576, -11, 442],
  0x1d706: [583, -13, 694],
  0x1d707: [603, -216, 442],
  0x1d708: [494, 0, 442],
  0x1d709: [438, -205, 697],
  0x1d70a: [485, -11, 442],
  0x1d70b: [570, -11, 431],
  0x1d70c: [517, -216, 442],
  0x1d70d: [363, -108, 442],
  0x1d70e: [571, -11, 431],
  0x1d70f: [437, -12, 431],
  0x1d710: [540, -11, 442],
  0x1d711: [654, -218, 442],
  0x1d712: [626, -205, 442],
  0x1d713: [651, -205, 694],
  0x1d714: [622, -11, 442],
};

/** Glyphs outside the math face (Hebrew option letters א–ד) fall back to the sans face. */
const FALLBACK_GLYPH: readonly [number, number, number] = [680, -20, 720];

/** Ascent / descent of the label face (hhea), also forced on the @font-face so DOM boxes match. */
export const LABEL_FONT_ASCENT = 0.806;
export const LABEL_FONT_DESCENT = 0.194;

/** Script size and drop of a subscript (ℓ₁), in em of the label. */
const SUBSCRIPT_SCALE = 0.7;
export const SUBSCRIPT_DROP_EM = 0.18;

const MATH_ITALIC_CAPITAL = 0x1d434;
const MATH_ITALIC_SMALL = 0x1d44e;
const PLANCK_H = 0x210e; // math italic h lives outside the block (U+1D455 is reserved)
const MATH_ITALIC_ALPHA = 0x1d6fc;
const MEDIUM_MATH_SPACE = '\u205f'; // TeX's medium space around a binary operator (4/18 em)
const MINUS = '\u2212';
const SUBSCRIPT_DIGITS = '₀₁₂₃₄₅₆₇₈₉';

/** One run of a shaped label: normal size, or a lowered subscript. */
export type LabelRun = { text: string; sub: boolean };

export type ShapedLabel = {
  /** The label as authored (e.g. "(4x + 6)°"). */
  source: string;
  /** A Hebrew word label (e.g. "מדף עליון"): set as right-to-left text, not as mathematics. */
  rtl: boolean;
  runs: LabelRun[];
  /** Advance width, em. */
  width: number;
  /** Ink extent above / below the baseline, em (yMax up, yMin down; y up). */
  yMax: number;
  yMin: number;
};

function mathItalic(ch: string): string {
  const cp = ch.codePointAt(0) ?? 0;
  if (ch === 'h') return String.fromCodePoint(PLANCK_H);
  if (cp >= 0x41 && cp <= 0x5a) return String.fromCodePoint(MATH_ITALIC_CAPITAL + cp - 0x41);
  if (cp >= 0x61 && cp <= 0x7a) return String.fromCodePoint(MATH_ITALIC_SMALL + cp - 0x61);
  if (cp >= 0x3b1 && cp <= 0x3c9) return String.fromCodePoint(MATH_ITALIC_ALPHA + cp - 0x3b1);
  return ch;
}

const isOperand = (ch: string | undefined) => ch !== undefined && /[0-9A-Za-zα-ω)°?]/.test(ch);

/**
 * TeX-like shaping: letters become math-italic code points, "-" becomes a minus sign, and a
 * binary + / − / = gets medium math spaces on both sides (a leading sign stays tight).
 */
const HEBREW = /[֐-׿]/;
const WORD_SPACE_EM = 0.28;

export function shapeLabel(source: string): ShapedLabel {
  if (HEBREW.test(source) && [...source.trim()].length > 1) {
    // Words are text, not mathematics: keep them (and their spaces) as written, right to left.
    const text = source.trim().replace(/\s+/g, ' ');
    const [, lo, hi] = FALLBACK_GLYPH;
    const width = [...text].reduce((sum, ch) => sum + (ch === ' ' ? WORD_SPACE_EM : (GLYPHS[ch.codePointAt(0) ?? 0]?.[0] ?? FALLBACK_GLYPH[0]) / 1000), 0);
    return { source, rtl: true, runs: [{ text, sub: false }], width, yMax: hi / 1000, yMin: lo / 1000 };
  }
  const chars = [...source.replace(/\s+/g, '')];
  const runs: LabelRun[] = [];
  const push = (text: string, sub: boolean) => {
    const last = runs[runs.length - 1];
    if (last && last.sub === sub) last.text += text;
    else runs.push({ text, sub });
  };
  chars.forEach((ch, index) => {
    const sub = SUBSCRIPT_DIGITS.indexOf(ch);
    if (sub >= 0) {
      push(String(sub), true);
      return;
    }
    const operator = ch === '-' || ch === '−' ? MINUS : ch === '+' || ch === '=' ? ch : null;
    if (operator) {
      const binary = isOperand(chars[index - 1]);
      push(binary ? `${MEDIUM_MATH_SPACE}${operator}${MEDIUM_MATH_SPACE}` : operator, false);
      return;
    }
    push(mathItalic(ch), false);
  });

  let width = 0;
  let yMax = 0;
  let yMin = 0;
  for (const run of runs) {
    const scale = run.sub ? SUBSCRIPT_SCALE : 1;
    const shift = run.sub ? -SUBSCRIPT_DROP_EM : 0;
    for (const ch of run.text) {
      const [advance, lo, hi] = GLYPHS[ch.codePointAt(0) ?? 0] ?? FALLBACK_GLYPH;
      width += (advance / 1000) * scale;
      if (hi > lo) {
        yMax = Math.max(yMax, (hi / 1000) * scale + shift);
        yMin = Math.min(yMin, (lo / 1000) * scale + shift);
      }
    }
  }
  return { source, rtl: false, runs, width, yMax, yMin };
}

/** The plain text a shaped label draws (tests read labels back through this inverse). */
export function shapedText(label: ShapedLabel): string {
  return label.runs.map(run => run.text).join('');
}
