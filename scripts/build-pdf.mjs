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
  await page.waitForSelector('[data-curriculum-ready="true"]', { timeout: 20000 });
  await page.waitForFunction(() => document.querySelectorAll('.a4-page').length === 18, null, { timeout: 20000 });
  await page.emulateMedia({ media: 'print' });

  const pageCount = await page.locator('.a4-page').count();
  if (pageCount !== 18) throw new Error(`Expected 18 A4 pages across units 1-5, found ${pageCount}`);

  const layout = await page.locator('.a4-page').evaluateAll((pages) => pages.map((node, index) => {
    const el = node;
    const rect = el.getBoundingClientRect();
    const content = el.querySelector('.page-content');
    const contentRect = content?.getBoundingClientRect();
    const unit = Number(el.getAttribute('data-unit'));
    const localPage = Number(el.getAttribute('data-page'));
    const isVerbatimCurriculum = unit === 5;
    const questions = [...el.querySelectorAll(isVerbatimCurriculum ? '.bbb-source-block' : '.question-block')];
    const questionContents = [...el.querySelectorAll(isVerbatimCurriculum ? '.bbb-source-block' : '.question-content')];
    const markerCount = el.querySelectorAll('.question-marker').length;
    const subpartCount = el.querySelectorAll('.subpart').length;
    const subpartMarkerCount = el.querySelectorAll('.subpart-marker').length;
    const sourceNumberCount = el.querySelectorAll('.bbb-source .qnum').length;
    const sourceShaCount = el.querySelectorAll('.bbb-source-block[data-source-sha256]').length;
    const overflowingQuestions = questions.filter(q => {
      const qRect = q.getBoundingClientRect();
      return qRect.bottom > rect.bottom + 1 || qRect.top < rect.top - 1 || qRect.right > rect.right + 1 || qRect.left < rect.left - 1;
    }).length;
    const internallyOverflowingQuestions = questions.filter(q =>
      q.scrollHeight - q.clientHeight > 2 || q.scrollWidth - q.clientWidth > 2
    ).length;
    const contentRects = questionContents.map(q => q.getBoundingClientRect());
    const lastContentRect = contentRects.at(-1);
    const bottomGapPx = contentRect && lastContentRect ? Math.max(0, contentRect.bottom - lastContentRect.bottom) : null;
    const bottomGapRatio = contentRect && bottomGapPx != null && contentRect.height > 0 ? bottomGapPx / contentRect.height : null;
    const interQuestionGaps = contentRects.slice(1).map((current, i) => Math.max(0, current.top - contentRects[i].bottom));
    const maxInterQuestionGapPx = interQuestionGaps.length ? Math.max(...interQuestionGaps) : 0;
    const maxInterQuestionGapRatio = contentRect && contentRect.height > 0 ? maxInterQuestionGapPx / contentRect.height : 0;
    return {
      renderIndex: index + 1,
      unit,
      localPage,
      isVerbatimCurriculum,
      widthPx: rect.width,
      heightPx: rect.height,
      scrollOverflow: el.scrollHeight - el.clientHeight,
      overflowingQuestions,
      internallyOverflowingQuestions,
      bottomGapPx,
      bottomGapRatio,
      maxInterQuestionGapPx,
      maxInterQuestionGapRatio,
      questionCount: questions.length,
      markerCount,
      subpartCount,
      subpartMarkerCount,
      sourceNumberCount,
      sourceShaCount,
    };
  }));

  const expectedPages = [
    [1,1],[1,2],[1,3],
    [2,1],[2,2],[2,3],[2,4],[2,5],[2,6],
    [3,1],[3,2],[3,3],
    [4,1],[4,2],
    [5,1],[5,2],[5,3],[5,4],
  ];

  const failures = layout.filter((item, index) => {
    const authoredMarkerFailure = !item.isVerbatimCurriculum && (
      item.markerCount !== item.questionCount || item.subpartMarkerCount !== item.subpartCount
    );
    const curriculumFidelityFailure = item.isVerbatimCurriculum && (
      item.questionCount !== 2 || item.sourceNumberCount !== 2 || item.sourceShaCount !== 2
    );
    return (
      item.scrollOverflow > 2 ||
      item.overflowingQuestions > 0 ||
      item.internallyOverflowingQuestions > 0 ||
      item.questionCount === 0 ||
      authoredMarkerFailure ||
      curriculumFidelityFailure ||
      (item.bottomGapRatio != null && item.bottomGapRatio > 0.12) ||
      item.maxInterQuestionGapRatio > 0.19 ||
      item.unit !== expectedPages[index][0] ||
      item.localPage !== expectedPages[index][1]
    );
  });
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
