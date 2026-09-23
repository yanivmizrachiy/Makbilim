import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const file = path.join(process.cwd(), 'src', 'content', 'question-plan.json');
const fail = (message) => {
  console.error(`question-plan: FAIL — ${message}`);
  process.exitCode = 1;
};

if (!fs.existsSync(file)) {
  fail('src/content/question-plan.json is missing');
} else {
  const plan = JSON.parse(fs.readFileSync(file, 'utf8'));
  const units = plan.units ?? [];
  const tasks = units.flatMap((unit) => unit.tasks ?? []);

  if (plan.originalTaskCount !== 58) fail('originalTaskCount must be 58');
  if (tasks.length !== 58) fail(`expected 58 original tasks, found ${tasks.length}`);
  if (plan.curriculumSourceTaskBlocks !== 8) fail('curriculumSourceTaskBlocks must be 8');
  if (units.length !== 4) fail(`question plan must contain 4 authored units, found ${units.length}`);

  const expectedCounts = new Map([[1, 14], [2, 24], [3, 12], [4, 8]]);
  const ids = new Set();

  for (const unit of units) {
    const expected = expectedCounts.get(unit.unit);
    if (!expected) fail(`unexpected authored unit ${unit.unit}`);
    if ((unit.tasks ?? []).length !== expected) fail(`unit ${unit.unit} expected ${expected} tasks`);
    if (unit.taskCount !== expected) fail(`unit ${unit.unit} taskCount metadata mismatch`);

    const pages = [...new Set((unit.tasks ?? []).map((task) => task.page))].sort((a, b) => a - b);
    const expectedPages = Array.from({ length: unit.pages }, (_, i) => i + 1);
    if (JSON.stringify(pages) !== JSON.stringify(expectedPages)) {
      fail(`unit ${unit.unit} pages must be contiguous and start at 1`);
    }

    for (const task of unit.tasks ?? []) {
      if (ids.has(task.id)) fail(`duplicate task id ${task.id}`);
      ids.add(task.id);
      if (!/^U[1-4]-P\d+-[A-Z]$/.test(task.id)) fail(`invalid internal task id ${task.id}`);
      if (!['D1', 'D2', 'D3', 'D4', 'D5'].includes(task.difficulty)) fail(`invalid difficulty ${task.id}`);
      if (!['V1', 'V2', 'V3', 'V4'].includes(task.visualDemand)) fail(`invalid visual demand ${task.id}`);
      if (!task.format || !task.skill || !task.instructionVerb || !task.progressionGain) {
        fail(`task ${task.id} lacks required planning metadata`);
      }
    }
  }

  if (plan.studentVisibleQuestionNumbers !== true) fail('student-visible question numbering must be enabled (continuous 1..N)');
  if (plan.questionNumbering !== 'continuous-global') fail('question numbering must be continuous-global');
  if (plan.subpartNumbering !== 'hebrew-letters') fail('sub-parts must be lettered (א, ב, ג…)');
}

if (!process.exitCode) console.log('question-plan: PASS');
