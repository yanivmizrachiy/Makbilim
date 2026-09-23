/**
 * The question text and the drawing use the same names (units 2–4).
 *
 * A student who reads "חשבו את ∠B" looks for B in the drawing. So every angle a stem names — ∠X,
 * a Greek letter, or an angle expression such as (4x + 6)° — is drawn as a label in that task's
 * diagram, and the angle to find carries its name, never a bare "?". A "?" is kept only where the
 * stem refers to the angle without naming it ("the corresponding angle"). Conversely, in the
 * calculation and converse units no Latin or Greek letter appears in a drawing that the task text
 * never mentions. Measured on the rendered SVG text.
 */
import { describe, expect, it, vi } from 'vitest';
import { unit2Questions } from '../../src/content/questions-unit2';
import { unit3Questions } from '../../src/content/questions-unit3';
import { unit4Questions } from '../../src/content/questions-unit4';
import { probeModule, renderBookletDiagrams } from './support/diagram-capture';
import { shapeLabel } from '../../src/geometry/label-font';

vi.mock('../../src/geometry/ParallelLinesDiagram', importOriginal => probeModule(importOriginal, 'ParallelLinesDiagram', 'parallel'));
vi.mock('../../src/geometry/ThreeLinesDiagram', importOriginal => probeModule(importOriginal, 'ThreeLinesDiagram', 'three'));

type Task = {
  id: string;
  stem: string;
  subparts?: string[] | undefined;
  choices?: string[] | undefined;
  proofLines?: Array<{ claim: string; reason?: string | undefined }> | undefined;
  tableRows?: Array<{ label: string; relation?: string | undefined; value?: string | undefined }> | undefined;
  diagram?: unknown;
};

const tasks: Task[] = [...unit2Questions, ...unit3Questions, ...unit4Questions];
const diagrams = await renderBookletDiagrams();

const decode = (text: string) =>
  text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&');

/**
 * The names drawn next to the angle marks of a task's diagram(s). The glyphs are set in math italic
 * (𝐴, 𝛼 — the same face as the stem's MathJax), so each label is read by the name it renders,
 * data-label, and its visible text must be that name's shaped form.
 */
function drawnLabels(taskId: string): string[] {
  return diagrams
    .filter(d => d.taskId === taskId)
    .flatMap(d => [...d.svg.matchAll(/<text class="angle-label-text[^"]*"[^>]*data-label="([^"]*)"[^>]*>([\s\S]*?)<\/text>/g)].map(m => {
      const name = decode(m[1]!);
      const shown = decode(m[2]!.replace(/<[^>]+>/g, ''));
      expect(shown, `${taskId}: label "${name}" renders as "${shown}"`).toBe(shapeLabel(name).runs.map(run => run.text).join(''));
      return name;
    }));
}

/** Angle names in a text: ∠X letters, Greek letters, and angle expressions like (4x + 6)°. */
function namedAngles(text: string) {
  return {
    letters: [...text.matchAll(/∠([A-Z])/g)].map(m => m[1]!),
    greek: [...text.matchAll(/[α-ω]/g)].map(m => m[0]),
    expressions: [...text.matchAll(/\([^()]*[xy][^()]*\)°/g)].map(m => m[0]),
  };
}

/** Everything the student reads for one task. */
const taskText = (task: Task) => [
  task.stem,
  ...(task.subparts ?? []),
  ...(task.choices ?? []),
  ...(task.proofLines ?? []).flatMap(row => [row.claim, row.reason ?? '']),
  ...(task.tableRows ?? []).flatMap(row => [row.label, row.relation ?? '', row.value ?? '']),
].join(' ');

const withDiagram = tasks.filter(task => task.diagram);

describe('stem ↔ diagram labels (units 2–4)', () => {
  it('finds a rendered diagram for every task that has one (self-check)', () => {
    expect(withDiagram.length).toBeGreaterThanOrEqual(40);
    for (const task of withDiagram) expect(diagrams.some(d => d.taskId === task.id), task.id).toBe(true);
    expect(namedAngles('נתון ∠A = 68°. חשבו את α ואת (2y + 18)°.')).toEqual({ letters: ['A'], greek: ['α'], expressions: ['(2y + 18)°'] });
  });

  for (const task of withDiagram) {
    it(`${task.id}: every angle the stem names is labelled in the drawing`, () => {
      const labels = drawnLabels(task.id);
      const { letters, greek, expressions } = namedAngles(task.stem);
      for (const letter of letters) expect(labels, `${task.id}: ∠${letter} is named in the stem but not drawn`).toContain(letter);
      for (const letter of greek) expect(labels, `${task.id}: ${letter} is named in the stem but not drawn`).toContain(letter);
      for (const expression of expressions) expect(labels, `${task.id}: ${expression} is named in the stem but not drawn`).toContain(expression);
    });

    it(`${task.id}: an angle the stem names is never drawn as "?"`, () => {
      const { letters, greek } = namedAngles(task.stem);
      if (letters.length + greek.length === 0) return;
      expect(drawnLabels(task.id)).not.toContain('?');
    });
  }

  it('in units 2 and 4 every Latin or Greek letter in a drawing is mentioned in the task text', () => {
    for (const task of withDiagram.filter(item => !item.id.startsWith('U3-'))) {
      const mentioned = namedAngles(taskText(task));
      for (const label of drawnLabels(task.id)) {
        if (/^[A-Z]$/.test(label)) expect(mentioned.letters, `${task.id}: ${label} is drawn but never mentioned`).toContain(label);
        if (/^[α-ω]$/.test(label)) expect(mentioned.greek, `${task.id}: ${label} is drawn but never mentioned`).toContain(label);
      }
    }
  });

  it('in unit 3 every angle named anywhere in the task (stem, claims, proof lines) is drawn', () => {
    for (const task of withDiagram.filter(item => item.id.startsWith('U3-'))) {
      const labels = drawnLabels(task.id);
      const named = namedAngles([task.stem, ...(task.subparts ?? []), ...(task.proofLines ?? []).map(row => row.claim)].join(' '));
      for (const letter of named.letters) expect(labels, `${task.id}: ∠${letter}`).toContain(letter);
    }
  });
});
