import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ANGLE_ROLE_STYLE, resolveAngleStyle } from '../../src/geometry/angle-roles';
import { ParallelLinesDiagram, type AngleMark } from '../../src/geometry/ParallelLinesDiagram';

const render = (angleMarks: AngleMark[]) =>
  renderToStaticMarkup(createElement(ParallelLinesDiagram, { orientationDeg: 0, transversalDeg: 62, angleMarks }));

const markGroup = (html: string, role: string) => {
  const match = new RegExp(`<g class="(angle-mark [^"]+)" data-angle-role="${role}"[^>]*>(.*?)</g>`).exec(html);
  return { className: match?.[1] ?? '', inner: match?.[2] ?? '' };
};

describe('semantic angle roles', () => {
  it('distinguishes the target from a given angle by colour AND by arc form (grayscale-safe)', () => {
    expect(ANGLE_ROLE_STYLE.target.tone).not.toBe(ANGLE_ROLE_STYLE.given.tone);
    expect(ANGLE_ROLE_STYLE.target.arcStyle).not.toBe(ANGLE_ROLE_STYLE.given.arcStyle);
  });

  it('gives auxiliary angles their own arc form, different from given and target', () => {
    expect(ANGLE_ROLE_STYLE.auxiliary.arcStyle).not.toBe(ANGLE_ROLE_STYLE.given.arcStyle);
    expect(ANGLE_ROLE_STYLE.auxiliary.arcStyle).not.toBe(ANGLE_ROLE_STYLE.target.arcStyle);
  });

  it('rejects a mark that declares both a role and explicit styling', () => {
    expect(() => resolveAngleStyle({ role: 'given', tone: 'secondary' })).toThrow(/must not also set/);
    expect(() => resolveAngleStyle({ role: 'target', arcStyle: 'single' })).toThrow(/must not also set/);
  });

  it('keeps explicit styling working for marks whose arc form is part of the task text', () => {
    expect(resolveAngleStyle({ tone: 'neutral', arcStyle: 'dashed' })).toEqual({ tone: 'neutral', arcStyle: 'dashed' });
    expect(resolveAngleStyle({})).toEqual({ tone: 'primary', arcStyle: 'single' });
  });

  it('renders each role with its central style, tagged for inspection', () => {
    const html = render([
      { intersection: 'top', sector: 0, role: 'given', value: '68°' },
      { intersection: 'bottom', sector: 0, role: 'target', label: '?' },
    ]);
    const given = markGroup(html, 'given');
    const target = markGroup(html, 'target');
    expect(given.className).toBe('angle-mark angle-mark--primary angle-mark--single');
    expect(target.className).toBe('angle-mark angle-mark--secondary angle-mark--double');
    expect(given.inner).not.toContain('angle-arc--outer');
    expect(target.inner).toContain('angle-arc--outer');
  });
});
