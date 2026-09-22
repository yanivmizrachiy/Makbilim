import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const pdfDir = path.join(root, 'artifacts', 'pdf');
const shotsDir = path.join(root, 'artifacts', 'screenshots');
const vivliostyleDir = path.join(root, 'artifacts', 'vivliostyle');
await fs.mkdir(pdfDir, { recursive: true });
await fs.mkdir(shotsDir, { recursive: true });
await fs.mkdir(vivliostyleDir, { recursive: true });

const HARD_TIMEOUT_MS = 4 * 60 * 1000;
let browser;
let hardTimedOut = false;

const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const server = spawn(process.execPath, [viteBin, 'preview', '--host', '127.0.0.1', '--port', '4173'], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverStdout = '';
let serverStderr = '';
server.stdout?.on('data', chunk => { serverStdout += String(chunk); });
server.stderr?.on('data', chunk => { serverStderr += String(chunk); });

const stopServer = async () => {
  if (server.exitCode != null) return;
  server.kill('SIGTERM');
  const exited = await Promise.race([
    new Promise(resolve => server.once('exit', () => resolve(true))),
    new Promise(resolve => setTimeout(() => resolve(false), 2500)),
  ]);
  if (!exited && server.exitCode == null) server.kill('SIGKILL');
};

const closeBrowser = async () => {
  if (!browser) return;
  await Promise.race([
    browser.close().catch(() => undefined),
    new Promise(resolve => setTimeout(resolve, 2500)),
  ]);
};

const hardWatchdog = setTimeout(() => {
  hardTimedOut = true;
  console.error(`pdf-visual: HARD TIMEOUT after ${HARD_TIMEOUT_MS / 1000}s`);
  try { server.kill('SIGKILL'); } catch {}
  process.exitCode = 124;
  setTimeout(() => process.exit(124), 500).unref();
}, HARD_TIMEOUT_MS);
hardWatchdog.unref();

const waitForServer = async () => {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (server.exitCode != null) {
      throw new Error(`Vite preview exited early with code ${server.exitCode}\nSTDOUT:\n${serverStdout}\nSTDERR:\n${serverStderr}`);
    }
    try {
      const response = await fetch('http://127.0.0.1:4173/');
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error(`Vite preview did not become ready within 20 seconds\nSTDOUT:\n${serverStdout}\nSTDERR:\n${serverStderr}`);
};

try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1800 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(20000);

  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForSelector('[data-curriculum-ready="true"]', { timeout: 15000 });
  await page.waitForFunction(() => document.querySelectorAll('.a4-page').length === 19, null, { timeout: 15000 });
  await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
  await page.waitForFunction(() => {
    const mathNodes = [...document.querySelectorAll('.mathjax-inline > span')];
    return mathNodes.length > 0 && mathNodes.every(node => node.getAttribute('data-mathjax') === 'svg');
  }, null, { timeout: 20000 });

  const mathJaxStatus = await page.locator('.mathjax-inline > span').evaluateAll(nodes => ({
    total: nodes.length,
    rendered: nodes.filter(node => node.getAttribute('data-mathjax') === 'svg').length,
    svgNodes: nodes.filter(node => node.querySelector('mjx-container svg')).length,
  }));
  if (
    mathJaxStatus.total === 0 ||
    mathJaxStatus.rendered !== mathJaxStatus.total ||
    mathJaxStatus.svgNodes !== mathJaxStatus.total
  ) {
    throw new Error(`MathJax SVG QA failed: ${JSON.stringify(mathJaxStatus)}`);
  }

  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
  await page.emulateMedia({ media: 'print' });

  const pageCount = await page.locator('.a4-page').count();
  if (pageCount !== 19) throw new Error(`Expected 19 A4 pages across units 1-5, found ${pageCount}`);

  const layout = await page.locator('.a4-page').evaluateAll((pages) => pages.map((node, index) => {
    const el = node;
    const rect = el.getBoundingClientRect();
    const header = el.querySelector('.page-header');
    const headerRect = header?.getBoundingClientRect();
    const content = el.querySelector('.page-content');
    const contentRect = content?.getBoundingClientRect();
    const footer = el.querySelector('.page-footer');
    const footerRect = footer?.getBoundingClientRect();
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
    const geometrySvgs = [...el.querySelectorAll('svg.geometry-diagram')];
    const geometrySvgCount = geometrySvgs.length;
    const unlabeledGeometrySvgCount = geometrySvgs.filter(svg => {
      const role = svg.getAttribute('role');
      const label = svg.getAttribute('aria-label')?.trim() ?? '';
      return role !== 'img' || label.length < 3;
    }).length;
    const geometryCollisionReport = geometrySvgs.map((svg, svgIndex) => {
      const svgRect = svg.getBoundingClientRect();
      const labelRects = [
        ...svg.querySelectorAll('.geometry-labels text, .angle-label-plate rect, .three-line-angle-mark .angle-badge'),
      ].map((label, labelIndex) => ({
        labelIndex,
        rect: label.getBoundingClientRect(),
      }));
      let collisions = 0;
      for (let i = 0; i < labelRects.length; i += 1) {
        for (let j = i + 1; j < labelRects.length; j += 1) {
          const a = labelRects[i].rect;
          const b = labelRects[j].rect;
          const gap = 2;
          const overlap = !(
            a.right + gap <= b.left ||
            b.right + gap <= a.left ||
            a.bottom + gap <= b.top ||
            b.bottom + gap <= a.top
          );
          if (overlap) collisions += 1;
        }
      }
      const outOfBounds = labelRects.filter(({ rect }) =>
        rect.left < svgRect.left - 1 ||
        rect.top < svgRect.top - 1 ||
        rect.right > svgRect.right + 1 ||
        rect.bottom > svgRect.bottom + 1
      ).length;
      return { svgIndex, labels: labelRects.length, collisions, outOfBounds };
    });
    const geometryCollisionCount = geometryCollisionReport.reduce((sum, item) => sum + item.collisions, 0);
    const geometryOutOfBoundsCount = geometryCollisionReport.reduce((sum, item) => sum + item.outOfBounds, 0);
    const projectTitleText = el.querySelector('.page-title-group h1')?.textContent?.trim() ?? '';
    const unitTitleText = el.querySelector('.unit-title')?.textContent?.trim() ?? '';
    const pageNumberText = el.querySelector('.page-number')?.textContent?.trim() ?? '';
    const footerLines = [...el.querySelectorAll('.page-footer > div')].map(n => n.textContent?.trim() ?? '');
    const overflowingQuestions = questions.filter(q => {
      const qRect = q.getBoundingClientRect();
      return qRect.bottom > rect.bottom + 1 || qRect.top < rect.top - 1 || qRect.right > rect.right + 1 || qRect.left < rect.left - 1;
    }).length;
    const internallyOverflowingQuestions = questions.filter(q =>
      q.scrollHeight - q.clientHeight > 2 || q.scrollWidth - q.clientWidth > 2
    ).length;
    const contentRects = questionContents.map(q => q.getBoundingClientRect());
    const firstContentRect = contentRects.at(0);
    const lastContentRect = contentRects.at(-1);
    const topGapPx = contentRect && firstContentRect ? Math.max(0, firstContentRect.top - contentRect.top) : null;
    const bottomGapPx = contentRect && lastContentRect ? Math.max(0, contentRect.bottom - lastContentRect.bottom) : null;
    const topGapRatio = contentRect && topGapPx != null && contentRect.height > 0 ? topGapPx / contentRect.height : null;
    const bottomGapRatio = contentRect && bottomGapPx != null && contentRect.height > 0 ? bottomGapPx / contentRect.height : null;
    const usedSpanRatio = contentRect && firstContentRect && lastContentRect && contentRect.height > 0
      ? Math.max(0, lastContentRect.bottom - firstContentRect.top) / contentRect.height
      : null;
    const interQuestionGaps = contentRects.slice(1).map((current, i) => Math.max(0, current.top - contentRects[i].bottom));
    const maxInterQuestionGapPx = interQuestionGaps.length ? Math.max(...interQuestionGaps) : 0;
    const maxInterQuestionGapRatio = contentRect && contentRect.height > 0 ? maxInterQuestionGapPx / contentRect.height : 0;
    const aspectRatio = rect.height > 0 ? rect.width / rect.height : 0;
    const expectedA4Ratio = 210 / 297;
    const a4RatioError = Math.abs(aspectRatio - expectedA4Ratio);
    const headerContentOverlap = Boolean(headerRect && contentRect && contentRect.top < headerRect.bottom - 1);
    const footerContentOverlap = Boolean(footerRect && contentRect && contentRect.bottom > footerRect.top + 1);
    return {
      renderIndex: index + 1,
      unit,
      localPage,
      isVerbatimCurriculum,
      widthPx: rect.width,
      heightPx: rect.height,
      aspectRatio,
      a4RatioError,
      scrollOverflow: el.scrollHeight - el.clientHeight,
      overflowingQuestions,
      internallyOverflowingQuestions,
      topGapPx,
      topGapRatio,
      bottomGapPx,
      bottomGapRatio,
      usedSpanRatio,
      maxInterQuestionGapPx,
      maxInterQuestionGapRatio,
      questionCount: questions.length,
      markerCount,
      subpartCount,
      subpartMarkerCount,
      sourceNumberCount,
      sourceShaCount,
      geometrySvgCount,
      unlabeledGeometrySvgCount,
      geometryCollisionCount,
      geometryOutOfBoundsCount,
      geometryCollisionReport,
      projectTitleText,
      unitTitleText,
      pageNumberText,
      footerLines,
      headerContentOverlap,
      footerContentOverlap,
    };
  }));

  const expectedPages = [
    [1,1],[1,2],[1,3],[1,4],
    [2,1],[2,2],[2,3],[2,4],[2,5],[2,6],
    [3,1],[3,2],[3,3],
    [4,1],[4,2],
    [5,1],[5,2],[5,3],[5,4],
  ];
  const canonicalProjectTitle = 'זוויות בין ישרים מקבילים';
  const canonicalFooter = [
    'יניב רז - מדריך מחוזי חט"ב בעיר ירושלים',
    'הדרכה במחוז ירושלים והעיר ירושלים - מנח"י, בהובלת איילת קריספין',
  ];

  const failures = layout.filter((item, index) => {
    const authoredMarkerFailure = !item.isVerbatimCurriculum && (
      item.markerCount !== item.questionCount || item.subpartMarkerCount !== item.subpartCount
    );
    const authoredGeometryFailure = !item.isVerbatimCurriculum && (
      item.geometrySvgCount < 1 ||
      item.unlabeledGeometrySvgCount > 0 ||
      item.geometryCollisionCount > 0 ||
      item.geometryOutOfBoundsCount > 0
    );
    const curriculumFidelityFailure = item.isVerbatimCurriculum && (
      item.questionCount !== 2 || item.sourceNumberCount !== 2 || item.sourceShaCount !== 2
    );
    const pageChromeFailure = (
      item.projectTitleText !== canonicalProjectTitle ||
      !item.unitTitleText.includes(`יחידה ${item.unit}`) ||
      item.pageNumberText !== `עמוד ${item.localPage}` ||
      item.footerLines.length !== 2 ||
      item.footerLines[0] !== canonicalFooter[0] ||
      item.footerLines[1] !== canonicalFooter[1] ||
      item.headerContentOverlap ||
      item.footerContentOverlap ||
      item.a4RatioError > 0.005
    );
    return (
      item.scrollOverflow > 2 ||
      item.overflowingQuestions > 0 ||
      item.internallyOverflowingQuestions > 0 ||
      item.questionCount === 0 ||
      authoredMarkerFailure ||
      authoredGeometryFailure ||
      curriculumFidelityFailure ||
      pageChromeFailure ||
      (item.topGapRatio != null && item.topGapRatio > 0.08) ||
      (item.bottomGapRatio != null && item.bottomGapRatio > 0.12) ||
      (item.usedSpanRatio != null && item.usedSpanRatio < 0.76) ||
      item.maxInterQuestionGapRatio > 0.19 ||
      item.unit !== expectedPages[index][0] ||
      item.localPage !== expectedPages[index][1]
    );
  });
  if (failures.length) throw new Error(`A4 layout QA failed: ${JSON.stringify(failures)}`);

  const vivliostyleSnapshot = await page.evaluate(() => {
    const root = document.documentElement.cloneNode(true);
    root.querySelectorAll('script, link[rel="modulepreload"]').forEach(node => node.remove());
    root.querySelectorAll('[src], [href]').forEach(node => {
      for (const attribute of ['src', 'href']) {
        const value = node.getAttribute(attribute);
        if (!value) continue;
        if (value.startsWith('./assets/')) node.setAttribute(attribute, value.replace('./assets/', '/assets/'));
        if (value.startsWith('/assets/')) node.setAttribute(attribute, value);
      }
    });
    const body = root.querySelector('body');
    if (body) {
      body.removeAttribute('data-curriculum-ready');
      body.setAttribute('data-vivliostyle-snapshot', 'true');
    }
    return '<!doctype html>\n' + root.outerHTML;
  });
  await fs.writeFile(path.join(vivliostyleDir, 'index.html'), vivliostyleSnapshot, 'utf8');

  const snapshotStats = await page.evaluate(() => ({
    pages: document.querySelectorAll('.a4-page').length,
    mathSvg: document.querySelectorAll('.mathjax-inline svg').length,
    geometrySvg: document.querySelectorAll('svg.geometry-diagram').length,
  }));
  if (snapshotStats.pages !== 19 || snapshotStats.mathSvg < 1 || snapshotStats.geometrySvg < 1) {
    throw new Error(`Vivliostyle snapshot incomplete: ${JSON.stringify(snapshotStats)}`);
  }

  const screenshotPageSet = async (suffix) => {
    for (let index = 0; index < pageCount; index += 1) {
      const locator = page.locator('.a4-page').nth(index);
      const item = layout[index];
      const stem = `u${item.unit}-p${item.localPage}`;
      await locator.screenshot({
        path: path.join(shotsDir, `${stem}-${suffix}.png`),
        animations: 'disabled',
        caret: 'hide',
        timeout: 7000,
      });
    }
  };

  await screenshotPageSet('color');

  await page.evaluate(() => {
    const style = document.createElement('style');
    style.id = 'grayscale-qa';
    style.textContent = 'html { filter: grayscale(1) !important; }';
    document.head.appendChild(style);
  });
  await screenshotPageSet('grayscale');
  await page.evaluate(() => document.getElementById('grayscale-qa')?.remove());

  await page.emulateMedia({ media: 'print', forcedColors: 'active' });
  await screenshotPageSet('forced-colors');
  await page.emulateMedia({ media: 'print', forcedColors: 'none' });

  await page.pdf({
    path: path.join(pdfDir, 'זוויות-בין-ישרים-מקבילים-chromium.pdf'),
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  await fs.writeFile(
    path.join(root, 'artifacts', 'layout-report.json'),
    `${JSON.stringify({ pageCount, expectedPages, mathJaxStatus, layout }, null, 2)}\n`,
    'utf8',
  );
  console.log(`pdf-visual: PASS — ${pageCount} A4 pages, ${mathJaxStatus.rendered}/${mathJaxStatus.total} MathJax SVG tokens, canonical chrome + utilization + collision-safe geometry + static Vivliostyle snapshot + color/grayscale/forced-colors snapshots generated`);
} finally {
  clearTimeout(hardWatchdog);
  await closeBrowser();
  await stopServer();
  if (hardTimedOut) process.exitCode = 124;
}
