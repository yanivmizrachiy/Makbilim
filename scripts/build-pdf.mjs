import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const pdfDir = path.join(root, 'artifacts', 'pdf');
const shotsDir = path.join(root, 'artifacts', 'screenshots');
await fs.mkdir(pdfDir, { recursive: true });
await fs.mkdir(shotsDir, { recursive: true });

const server = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '4173'], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
});

const waitForServer = async () => {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch('http://127.0.0.1:4173/');
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Vite preview did not become ready within 30 seconds');
};

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1800 }, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });

  const pageCount = await page.locator('.a4-page').count();
  if (pageCount !== 14) throw new Error(`Expected 14 A4 pages for units 1-4, found ${pageCount}`);

  const layout = await page.locator('.a4-page').evaluateAll((pages) => pages.map((node, index) => {
    const el = node;
    const rect = el.getBoundingClientRect();
    const content = el.querySelector('.page-content');
    const contentRect = content?.getBoundingClientRect();
    const questions = [...el.querySelectorAll('.question-block')];
    const questionContents = [...el.querySelectorAll('.question-content')];
    const markerCount = el.querySelectorAll('.question-marker').length;
    const subpartCount = el.querySelectorAll('.subpart').length;
    const subpartMarkerCount = el.querySelectorAll('.subpart-marker').length;
    const overflowingQuestions = questions.filter(q => {
      const qRect = q.getBoundingClientRect();
      return qRect.bottom > rect.bottom + 1 || qRect.top < rect.top - 1 || qRect.right > rect.right + 1 || qRect.left < rect.left - 1;
    }).length;
    const contentRects = questionContents.map(q => q.getBoundingClientRect());
    const lastContentRect = contentRects.at(-1);
    const bottomGapPx = contentRect && lastContentRect ? Math.max(0, contentRect.bottom - lastContentRect.bottom) : null;
    const bottomGapRatio = contentRect && bottomGapPx != null && contentRect.height > 0 ? bottomGapPx / contentRect.height : null;
    const interQuestionGaps = contentRects.slice(1).map((current, i) => Math.max(0, current.top - contentRects[i].bottom));
    const maxInterQuestionGapPx = interQuestionGaps.length ? Math.max(...interQuestionGaps) : 0;
    const maxInterQuestionGapRatio = contentRect && contentRect.height > 0 ? maxInterQuestionGapPx / contentRect.height : 0;
    const unit = Number(el.getAttribute('data-unit'));
    const localPage = Number(el.getAttribute('data-page'));
    return {
      renderIndex: index + 1,
      unit,
      localPage,
      widthPx: rect.width,
      heightPx: rect.height,
      scrollOverflow: el.scrollHeight - el.clientHeight,
      overflowingQuestions,
      bottomGapPx,
      bottomGapRatio,
      maxInterQuestionGapPx,
      maxInterQuestionGapRatio,
      questionCount: questions.length,
      markerCount,
      subpartCount,
      subpartMarkerCount,
    };
  }));

  const expectedPages = [
    [1,1],[1,2],[1,3],
    [2,1],[2,2],[2,3],[2,4],[2,5],[2,6],
    [3,1],[3,2],[3,3],
    [4,1],[4,2],
  ];

  const failures = layout.filter((item, index) =>
    item.scrollOverflow > 2 ||
    item.overflowingQuestions > 0 ||
    item.questionCount === 0 ||
    item.markerCount !== item.questionCount ||
    item.subpartMarkerCount !== item.subpartCount ||
    (item.bottomGapRatio != null && item.bottomGapRatio > 0.12) ||
    item.maxInterQuestionGapRatio > 0.19 ||
    item.unit !== expectedPages[index][0] ||
    item.localPage !== expectedPages[index][1]
  );
  if (failures.length) throw new Error(`A4 layout QA failed: ${JSON.stringify(failures)}`);

  for (let index = 0; index < pageCount; index += 1) {
    const locator = page.locator('.a4-page').nth(index);
    const item = layout[index];
    const stem = `u${item.unit}-p${item.localPage}`;
    await locator.screenshot({ path: path.join(shotsDir, `${stem}-color.png`) });
  }

  await page.evaluate(() => {
    const style = document.createElement('style');
    style.id = 'grayscale-qa';
    style.textContent = 'html { filter: grayscale(1) !important; }';
    document.head.appendChild(style);
  });
  for (let index = 0; index < pageCount; index += 1) {
    const locator = page.locator('.a4-page').nth(index);
    const item = layout[index];
    const stem = `u${item.unit}-p${item.localPage}`;
    await locator.screenshot({ path: path.join(shotsDir, `${stem}-grayscale.png`) });
  }
  await page.evaluate(() => document.getElementById('grayscale-qa')?.remove());

  await page.pdf({
    path: path.join(pdfDir, 'זוויות-בין-ישרים-מקבילים.pdf'),
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  await fs.writeFile(path.join(root, 'artifacts', 'layout-report.json'), `${JSON.stringify({ pageCount, expectedPages, layout }, null, 2)}\n`, 'utf8');
  console.log(`pdf-visual: PASS — ${pageCount} A4 pages, utilization + grayscale snapshots generated`);
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
