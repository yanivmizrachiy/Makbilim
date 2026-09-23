import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { unit1Questions } from '../../src/content/questions-unit1';
import { ANGLE_ROLE_STYLE, resolveAngleStyle } from '../../src/geometry/angle-roles';
import { ParallelLinesDiagram, type AngleMark } from '../../src/geometry/ParallelLinesDiagram';

/**
 * Tasks whose TEXT names the arc form of a marked pair ("the pair marked with a double arc"), so
 * their marks set the arc form explicitly. Nothing else in the pages may bypass the roles.
 */
const ARC_FORM_WHITELIST: Record<string, string> = {
  'U1-P1-D': 'the subparts name each pair by its arc form: one arc, two arcs, a dashed arc',
};

const PAGE_SOURCES = [
  'src/App.tsx',
  ...readdirSync('src/pages').filter(file => file.endsWith('.tsx')).map(file => join('src/pages', file)),
];
const WHITELIST_BLOCK = /arc-form-whitelist:start (\S+)([\s\S]*?)arc-form-whitelist:end/g;
const EXPLICIT_TONE = /\btone\s*[:=]/;
const EXPLICIT_ARC_STYLE = /\barcStyle\s*[:=]/;

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

describe('pages style angles by role only — colour never encodes the relation (SPEC 10.5, 11.3)', () => {
  it('scans every page source (self-check)', () => {
    expect(PAGE_SOURCES.length).toBeGreaterThanOrEqual(6);
    expect(EXPLICIT_TONE.test("{ sector: 0, tone: 'primary' }")).toBe(true);
    expect(EXPLICIT_ARC_STYLE.test("{ arcStyle: 'double' }")).toBe(true);
    expect(EXPLICIT_TONE.test("{ role: 'given' } // the role decides the tone")).toBe(false);
  });

  it('no page sets tone / arcStyle, except inside a block for a whitelisted task whose text names the arc form', () => {
    const seen: string[] = [];
    for (const file of PAGE_SOURCES) {
      const source = readFileSync(file, 'utf8');
      for (const [, id, body] of source.matchAll(WHITELIST_BLOCK)) {
        seen.push(id!);
        expect(ARC_FORM_WHITELIST[id!], `${file}: ${id} is not on the arc-form whitelist`).toBeDefined();
        // Even there only the arc FORM is set: a colour per pair would hint at the relation.
        expect(body, `${file}: whitelisted block ${id} sets a tone`).not.toMatch(EXPLICIT_TONE);
        expect(body, `${file}: whitelisted block ${id} sets no arc form`).toMatch(EXPLICIT_ARC_STYLE);
      }
      const outside = source.replace(WHITELIST_BLOCK, '');
      expect(outside, `${file} sets an explicit tone`).not.toMatch(EXPLICIT_TONE);
      expect(outside, `${file} sets an explicit arcStyle`).not.toMatch(EXPLICIT_ARC_STYLE);
    }
    expect(seen.sort()).toEqual(Object.keys(ARC_FORM_WHITELIST).sort());
  });

  it('a whitelisted task really names the arc form in its text', () => {
    for (const id of Object.keys(ARC_FORM_WHITELIST)) {
      const q = unit1Questions.find(item => item.id === id);
      expect(q, `${id} exists`).toBeDefined();
      const text = [q!.stem, ...(q!.subparts ?? [])].join(' ');
      expect(text).toMatch(/קשת אחת/);
      expect(text).toMatch(/שתי קשתות/);
      expect(text).toMatch(/מקווקו/);
    }
  });
});
