import { describe, expect, it } from 'vitest';
import { isMathToken, tokenizeMathText, toTeX } from '../../src/components/MathText';

describe('MathText canonical notation', () => {
  it('converts geometry and algebra symbols to TeX for MathJax SVG', () => {
    expect(toTeX('∠ABC = 64°')).toContain('\\angle');
    expect(toTeX('∠ABC = 64°')).toContain('64^{\\circ}');
    expect(toTeX('p ∥ q')).toContain('\\parallel');
    expect(toTeX('α = 2x + 5°')).toContain('\\alpha');
    expect(toTeX('α = 2x + 5°')).toContain('2x + 5^{\\circ}');
    expect(toTeX('ℓ₁ ∥ ℓ₂')).toContain('\\ell _{1}');
    expect(toTeX('ℓ₁ ∥ ℓ₂')).toContain('\\ell _{2}');
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
  });
});
