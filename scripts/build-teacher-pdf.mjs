import { chromium } from '@playwright/test';
import { PDFDocument } from '@cantoo/pdf-lib';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const pdfDir = path.join(root, 'artifacts', 'pdf');
const reportPath = path.join(root, 'artifacts', 'teacher-pdf-report.json');
await fs.mkdir(pdfDir, { recursive: true });

const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const server = spawn(process.execPath, [
  viteBin,
  'preview',
  '--config',
  'vite.teacher.config.ts',
  '--host',
  '127.0.0.1',
  '--port',
  '4174',
], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
});

let stdout = '';
let stderr = '';
server.stdout?.on('data', chunk => { stdout += String(chunk); });
server.stderr?.on('data', chunk => { stderr += String(chunk); });

const stopServer = async () => {
  if (server.exitCode != null) return;
  server.kill('SIGTERM');
  const exited = await Promise.race([
    new Promise(resolve => server.once('exit', () => resolve(true))),
    new Promise(resolve => setTimeout(() => resolve(false), 2500)),
  ]);
  if (!exited && server.exitCode == null) server.kill('SIGKILL');
};

const waitForServer = async () => {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (server.exitCode != null) {
      throw new Error(`Teacher Vite preview exited early with code ${server.exitCode}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
    }
    try {
      const response = await fetch('http://127.0.0.1:4174/teacher.html');
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error(`Teacher Vite preview did not become ready\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
};

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1800 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(15000);

  await page.goto('http://127.0.0.1:4174/teacher.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForSelector('[data-teacher-ready="true"]', { timeout: 15000 });
  await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });

  const expectedAnswerCount = await page.locator('[data-teacher-ready="true"]').getAttribute('data-answer-count');
  const answerCount = await page.locator('.teacher-answer-card').count();
  if (!expectedAnswerCount || Number(expectedAnswerCount) !== answerCount) {
    throw new Error(`Teacher answer count mismatch: expected=${expectedAnswerCount}, rendered=${answerCount}`);
  }

  const unit5SourceBlocks = await page.locator('[data-teacher-ready="true"]').getAttribute('data-unit5-source-blocks');
  if (Number(unit5SourceBlocks) !== 8) {
    throw new Error(`Teacher Unit 5 source-block policy mismatch: ${unit5SourceBlocks}`);
  }

  const mathCount = await page.locator('.mathjax-inline > span').count();
  if (mathCount > 0) {
    await page.waitForFunction(() => {
      const nodes = [...document.querySelectorAll('.mathjax-inline > span')];
      return nodes.every(node => node.getAttribute('data-mathjax') === 'svg');
    }, null, { timeout: 20000 });
  }

  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
  await page.emulateMedia({ media: 'print' });

  const pdfPath = path.join(pdfDir, 'זוויות-בין-ישרים-מקבילים-מדריך-למורה.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  const bytes = await fs.readFile(pdfPath);
  if (bytes.byteLength < 100_000) {
    throw new Error(`Teacher PDF suspiciously small: ${bytes.byteLength} bytes`);
  }

  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const pages = doc.getPages();
  if (pages.length < 4) {
    throw new Error(`Teacher PDF unexpectedly short: ${pages.length} pages`);
  }

  const A4_WIDTH_PT = 595.28;
  const A4_HEIGHT_PT = 841.89;
  const tolerance = 2;
  const dimensions = pages.map((pdfPage, index) => {
    const { width, height } = pdfPage.getSize();
    const a4 =
      Math.abs(width - A4_WIDTH_PT) <= tolerance &&
      Math.abs(height - A4_HEIGHT_PT) <= tolerance;
    return {
      page: index + 1,
      widthPt: Number(width.toFixed(2)),
      heightPt: Number(height.toFixed(2)),
      a4,
    };
  });

  const invalid = dimensions.filter(item => !item.a4);
  if (invalid.length) {
    throw new Error(`Teacher PDF contains non-A4 pages: ${JSON.stringify(invalid)}`);
  }

  const report = {
    status: 'PASS',
    answerCount,
    unit5SourceBlocks: Number(unit5SourceBlocks),
    mathJaxTokens: mathCount,
    bytes: bytes.byteLength,
    pages: pages.length,
    dimensions,
  };
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

  console.log(
    `teacher-pdf: PASS — ${answerCount} answers, ${pages.length} A4 pages, ${mathCount} MathJax token(s)`,
  );
} finally {
  if (browser) await browser.close().catch(() => undefined);
  await stopServer();
}
