import fs from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument } from '@cantoo/pdf-lib';
import { EXPECTED_PAGES } from './lib/booklet-pages.mjs';

const root = process.cwd();
const pdfDir = path.join(root, 'artifacts', 'pdf');
const canonicalPath = path.join(pdfDir, 'זוויות-בין-ישרים-מקבילים.pdf');
const chromiumPath = path.join(pdfDir, 'זוויות-בין-ישרים-מקבילים-chromium.pdf');
const reportPath = path.join(root, 'artifacts', 'pdf-crosscheck.json');

const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const SIZE_TOLERANCE_PT = 2.0;
const MIN_BYTES = 100_000;

async function inspect(filePath, renderer) {
  const bytes = await fs.readFile(filePath);
  const taggedStructure = bytes.includes(Buffer.from('/StructTreeRoot'));
  if (renderer === 'chromium' && !taggedStructure) {
    throw new Error('chromium PDF is missing /StructTreeRoot despite tagged: true');
  }
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const pages = doc.getPages();
  const dimensions = pages.map((page, index) => {
    const { width, height } = page.getSize();
    const a4 =
      Math.abs(width - A4_WIDTH_PT) <= SIZE_TOLERANCE_PT &&
      Math.abs(height - A4_HEIGHT_PT) <= SIZE_TOLERANCE_PT;
    return {
      page: index + 1,
      widthPt: Number(width.toFixed(2)),
      heightPt: Number(height.toFixed(2)),
      a4,
    };
  });

  if (pages.length !== EXPECTED_PAGES) {
    throw new Error(`${renderer} PDF expected ${EXPECTED_PAGES} pages, found ${pages.length}; size=${bytes.byteLength} bytes`);
  }
  if (bytes.byteLength < MIN_BYTES) {
    throw new Error(`${renderer} PDF has ${pages.length} pages but is suspiciously small: ${bytes.byteLength} bytes`);
  }
  const invalid = dimensions.filter(page => !page.a4);
  if (invalid.length) {
    throw new Error(`${renderer} PDF has non-A4 pages: ${JSON.stringify(invalid)}`);
  }

  return {
    renderer,
    path: path.relative(root, filePath).replaceAll('\\', '/'),
    bytes: bytes.byteLength,
    pages: pages.length,
    taggedStructure,
    dimensions,
  };
}

const [vivliostyle, chromium] = await Promise.all([
  inspect(canonicalPath, 'vivliostyle'),
  inspect(chromiumPath, 'chromium'),
]);

if (vivliostyle.pages !== chromium.pages) {
  throw new Error(`PDF renderer page-count mismatch: vivliostyle=${vivliostyle.pages}, chromium=${chromium.pages}`);
}

await fs.writeFile(
  reportPath,
  JSON.stringify({
    status: 'PASS',
    expectedPages: EXPECTED_PAGES,
    a4: { widthPt: A4_WIDTH_PT, heightPt: A4_HEIGHT_PT, tolerancePt: SIZE_TOLERANCE_PT },
    renderers: [vivliostyle, chromium],
  }, null, 2) + '\n',
  'utf8',
);

console.log(
  `pdf-crosscheck: PASS — ${EXPECTED_PAGES} A4 pages in Vivliostyle and Chromium; ` +
  `${vivliostyle.bytes} / ${chromium.bytes} bytes`,
);
