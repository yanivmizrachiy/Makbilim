/**
 * One source of truth per structural fact (SPEC 0.2): the printed order of pages and questions,
 * the page of every task and the curriculum block order are each stated once and every other
 * statement is checked against it.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import App from '../../src/App';
import { AUTHORED_TASK_IDS, BOOKLET_PAGES, CURRICULUM_QUESTION_IDS } from '../../src/content/booklet';
import plan from '../../src/content/question-plan.json';
import curriculumManifest from '../../sources/curriculum/bbb-parallel-lines.manifest.json';
import { unit1Questions } from '../../src/content/questions-unit1';
import { unit2Questions } from '../../src/content/questions-unit2';
import { unit3Questions } from '../../src/content/questions-unit3';
import { unit4Questions } from '../../src/content/questions-unit4';
import { teacherAnswerKey } from '../../src/content/answer-key';

const html = renderToStaticMarkup(createElement(App));
const inOrder = (attribute: string) => [...html.matchAll(new RegExp(`${attribute}="([^"]+)"`, 'g'))].map(match => match[1]!);

describe('single source of truth', () => {
  it('renders the authored pages in the order of booklet-pages.json', () => {
    const rendered = [...new Set(inOrder('data-page-id'))].filter(id => !id.startsWith('C-'));
    expect(rendered).toEqual(BOOKLET_PAGES.filter(page => !page.curriculum).map(page => page.id));
  });

  it('prints the authored questions in the order of question-plan.json (so the global numbers are the printed order)', () => {
    expect([...new Set(inOrder('data-task-id'))]).toEqual([...AUTHORED_TASK_IDS]);
  });

  it('places every task on the page its content file declares', () => {
    const contentPage = new Map([...unit1Questions, ...unit2Questions, ...unit3Questions, ...unit4Questions].map(q => [q.id, q.page]));
    for (const unit of plan.units) {
      for (const task of unit.tasks) expect(contentPage.get(task.id), task.id).toBe(task.page);
    }
  });

  it('keeps the unit and page of every teacher-key entry in step with the content (never an independent copy)', () => {
    const contentPage = new Map([...unit1Questions, ...unit2Questions, ...unit3Questions, ...unit4Questions].map(q => [q.id, q.page]));
    for (const entry of teacherAnswerKey) {
      expect(entry.page, entry.id).toBe(contentPage.get(entry.id));
      expect(`U${entry.unit}-`, entry.id).toBe(entry.id.slice(0, 3));
    }
  });

  it('numbers the curriculum questions in the pinned source-manifest order', () => {
    expect([...CURRICULUM_QUESTION_IDS]).toEqual(curriculumManifest.blocks.map(block => block.id));
  });
});
