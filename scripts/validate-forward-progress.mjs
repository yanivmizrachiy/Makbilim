import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const file = path.join(process.cwd(), 'src', 'content', 'question-plan.json');
const plan = JSON.parse(fs.readFileSync(file, 'utf8'));

const fail = (message) => {
  console.error(`forward-progress: FAIL — ${message}`);
  process.exitCode = 1;
};

const rankD = (d) => Number(String(d).replace('D', ''));
const rankV = (v) => Number(String(v).replace('V', ''));

for (const unit of plan.units ?? []) {
  const tasks = unit.tasks ?? [];

  for (let i = 1; i < tasks.length; i += 1) {
    const prev = tasks[i - 1];
    const cur = tasks[i];

    const sameCore = prev.skill === cur.skill && prev.format === cur.format && prev.difficulty === cur.difficulty;
    if (sameCore) fail(`${prev.id} -> ${cur.id}: adjacent tasks repeat skill, format and difficulty`);

    const sameGain = prev.progressionGain === cur.progressionGain;
    if (sameGain) fail(`${prev.id} -> ${cur.id}: adjacent tasks repeat the same progression gain`);

    if (rankD(cur.difficulty) < rankD(prev.difficulty) - 1) {
      fail(`${prev.id} -> ${cur.id}: difficulty drops too sharply`);
    }

    if (rankV(cur.visualDemand) > rankV(prev.visualDemand) + 2 && rankD(cur.difficulty) > rankD(prev.difficulty)) {
      fail(`${prev.id} -> ${cur.id}: visual and mathematical demand jump too sharply together`);
    }
  }

  for (let i = 0; i < tasks.length - 2; i += 1) {
    const window = tasks.slice(i, i + 3);
    const formats = new Set(window.map((task) => task.format));
    const skills = new Set(window.map((task) => task.skill));
    if (formats.size === 1 && skills.size === 1) {
      fail(`${window[0].id}..${window[2].id}: three-task monotony detected`);
    }
  }
}

if (!process.exitCode) console.log('forward-progress: PASS');
