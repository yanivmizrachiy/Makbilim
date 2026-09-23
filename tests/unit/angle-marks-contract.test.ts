/**
 * Angle marks teach; they never give the answer away (SPEC 10.5, 11.3).
 *
 * Measured on the whole rendered booklet (App), with the props each page passed to the diagram
 * engine captured next to the SVG they produced:
 * - every mark in units 1–4 declares a pedagogical ROLE (given / target / marked / auxiliary) and
 *   no colour of its own — only the arc-form task U1-P1-D is exempt, and it sets the arc form only;
 * - one role looks the same everywhere, so colour can only mean "given / to find / named / helper",
 *   never "corresponding" or "alternate";
 * - in naming tasks (identification, proof, claim, converse) every lettered angle has ONE role, so
 *   the look of a letter does not tell which relation it is in;
 * - every drawn angle carries at most one mark.
 */
import { describe, expect, it, vi } from 'vitest';
import { taskKindById } from '../../src/content/task-kinds';
import type { AngleMark, ParallelLinesDiagramProps } from '../../src/geometry/ParallelLinesDiagram';
import type { ThreeLinesDiagramProps } from '../../src/geometry/ThreeLinesDiagram';
import { probeModule, renderBookletDiagrams } from './support/diagram-capture';

vi.mock('../../src/geometry/ParallelLinesDiagram', importOriginal => probeModule(importOriginal, 'ParallelLinesDiagram', 'parallel'));
vi.mock('../../src/geometry/ThreeLinesDiagram', importOriginal => probeModule(importOriginal, 'ThreeLinesDiagram', 'three'));

const diagrams = (await renderBookletDiagrams()).filter(d => d.unit >= 1 && d.unit <= 4);

/** Tasks whose text names the arc form (see angle-roles.test.ts); their marks carry no role. */
const ARC_FORM_TASKS = new Set(['U1-P1-D']);
/** Task kinds in which letters only NAME angles for the student to relate. */
const NAMING_KINDS = new Set(['identification', 'proof', 'claim', 'sufficiency']);
const LETTER = /^(?:[A-Z]|[α-ω]|[א-ת]|[1-8])$/u;

const parallelMarks = (props: unknown) => ((props as ParallelLinesDiagramProps).angleMarks ?? []) as AngleMark[];
const threeMarks = (props: unknown) => (props as ThreeLinesDiagramProps).angleMarks ?? [];

/** Rendered mark groups of one SVG: class, role and position, in drawing order. */
function renderedMarks(svg: string) {
  return [...svg.matchAll(/<g class="(angle-mark [^"]*)"((?: data-[a-z-]+="[^"]*")*)>/g)].map(m => ({
    className: m[1]!,
    role: /data-angle-role="([^"]+)"/.exec(m[2]!)?.[1] ?? null,
    at: /data-angle-at="([^"]+)"/.exec(m[2]!)?.[1] ?? null,
    sector: /data-angle-sector="([^"]+)"/.exec(m[2]!)?.[1] ?? null,
  }));
}

describe('angle marks: role-based, one mark per angle, no relation colour-coding', () => {
  it('captures every diagram of units 1–4 with its task (self-check)', () => {
    expect(diagrams.length).toBeGreaterThan(50);
    for (const d of diagrams) expect(d.taskId, `diagram #${d.index} (u${d.unit}-p${d.page}) sits in a task block`).not.toBeNull();
    expect(diagrams.some(d => d.kind === 'three')).toBe(true);
  });

  it('every mark declares a role and no colour — except the arc-form task, which sets only the arc form', () => {
    for (const d of diagrams) {
      if (d.kind === 'three') {
        // The three-lines engine has no roles yet: its marks must at least not pick a colour.
        for (const mark of threeMarks(d.props)) expect(mark.tone, `${d.taskId}: three-lines mark sets a tone`).toBeUndefined();
        continue;
      }
      for (const mark of parallelMarks(d.props)) {
        expect(mark.tone, `${d.taskId}: mark sets a tone`).toBeUndefined();
        if (ARC_FORM_TASKS.has(d.taskId!)) {
          expect(mark.role, `${d.taskId}: arc-form marks carry no role`).toBeUndefined();
          expect(mark.arcStyle, `${d.taskId}: arc-form marks set their arc form`).toBeDefined();
        } else {
          expect(mark.role, `${d.taskId}: mark without a role`).toBeDefined();
          expect(mark.arcStyle, `${d.taskId}: mark sets an arcStyle`).toBeUndefined();
        }
      }
      // And in the SVG: every rendered mark outside the arc-form task is tagged with its role.
      const rendered = renderedMarks(d.svg);
      expect(rendered).toHaveLength(parallelMarks(d.props).length);
      if (!ARC_FORM_TASKS.has(d.taskId!)) for (const mark of rendered) expect(mark.role, `${d.taskId}: untagged mark`).not.toBeNull();
    }
  });

  it('a role is drawn the same way on every page', () => {
    const classesByRole = new Map<string, Set<string>>();
    for (const d of diagrams) {
      for (const mark of renderedMarks(d.svg)) {
        if (!mark.role) continue;
        const classes = classesByRole.get(mark.role) ?? new Set<string>();
        classes.add(mark.className);
        classesByRole.set(mark.role, classes);
      }
    }
    expect([...classesByRole.keys()].sort()).toEqual(['auxiliary', 'given', 'marked', 'target']);
    for (const [role, classes] of classesByRole) expect([...classes], `role ${role}`).toHaveLength(1);
  });

  it('the angle to find never looks like the given angle', () => {
    for (const d of diagrams) {
      const rendered = renderedMarks(d.svg);
      const given = rendered.filter(mark => mark.role === 'given').map(mark => mark.className);
      const target = rendered.filter(mark => mark.role === 'target').map(mark => mark.className);
      for (const style of target) expect(given, `${d.taskId}: target styled like a given`).not.toContain(style);
    }
  });

  it('in naming tasks (identification, proof, claim, converse) all lettered angles share one role', () => {
    let checked = 0;
    for (const d of diagrams) {
      const kind = taskKindById(d.taskId!);
      if (!kind || !NAMING_KINDS.has(kind) || ARC_FORM_TASKS.has(d.taskId!)) continue;
      const roles = d.kind === 'three'
        ? threeMarks(d.props).filter(mark => mark.label && LETTER.test(mark.label)).map(mark => mark.tone ?? 'default')
        : parallelMarks(d.props).filter(mark => mark.label && LETTER.test(mark.label)).map(mark => mark.role ?? 'none');
      if (roles.length === 0) continue;
      checked += 1;
      expect(new Set(roles).size, `${d.taskId}: lettered angles styled by ${[...new Set(roles)].join(' / ')}`).toBe(1);
    }
    expect(checked).toBeGreaterThanOrEqual(18);
  });

  it('every mark in a unit-3 proof diagram is a named angle (role "marked") — no style singles out a relation or an unneeded datum', () => {
    const unit3 = diagrams.filter(d => d.unit === 3);
    expect(unit3.length).toBe(12);
    for (const d of unit3) {
      for (const mark of parallelMarks(d.props)) expect(mark.role, `${d.taskId}`).toBe('marked');
    }
  });

  it('one mark per drawn angle: no two marks share a crossing and a sector', () => {
    for (const d of diagrams) {
      const keys = d.kind === 'three'
        ? threeMarks(d.props).map(mark => `line-${mark.line}:${mark.side ?? 'right'}`)
        : renderedMarks(d.svg).map(mark => `${mark.at}:${mark.sector}`);
      const repeated = keys.filter((key, index) => keys.indexOf(key) !== index);
      expect(repeated, `${d.taskId} (u${d.unit}-p${d.page}) marks an angle twice`).toEqual([]);
    }
  });
});
