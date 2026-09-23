/**
 * Visual-baseline contract — the single definition shared by
 *   scripts/validate-visual-baseline.mjs  (the CI gate)
 *   scripts/update-visual-baseline.mjs    (the deliberate re-baseline tool)
 * so the gate and the tool can never disagree about what "the same layout" and
 * "a healthy page" mean.
 *
 * Inputs are the layout reports written by scripts/build-pdf.mjs
 * (artifacts/layout-report.json) and the committed qa/visual-baseline.json,
 * which share one shape: { pageCount, expectedPages, mathJaxStatus, layout[] }.
 */

export const EXPECTED_PAGES = 21;

/** Structural facts per page that must match the baseline exactly. */
export const EXACT_KEYS = [
  'pageId',
  'globalPage',
  'isVerbatimCurriculum',
  'questionCount',
  'markerCount',
  'subpartCount',
  'subpartMarkerCount',
  'sourceNumberCount',
  'sourceShaCount',
  'geometrySvgCount',
  'unlabeledGeometrySvgCount',
  'geometryCollisionCount',
  'geometryOutOfBoundsCount',
  'projectTitleText',
  'topicTitleText',
  'pageNumberText',
  'headerContentOverlap',
  'footerContentOverlap',
];

/** Layout metrics compared with small explicit tolerances (renderer noise only). */
export const TOLERANCES = {
  widthPx: 1,
  heightPx: 1,
  topGapRatio: 0.015,
  bottomGapRatio: 0.02,
  usedSpanRatio: 0.03,
  maxInterQuestionGapRatio: 0.025,
};

/**
 * Page content may never extend past the page's content area. A ratio above 1 means
 * the questions run into the footer band / get clipped by the fixed 297mm page.
 * (This rule closes the hole that let two overflowing pages be baselined as correct.)
 */
export const MAX_USED_SPAN_RATIO = 1.001;

/** Per-page counters that must be zero in any acceptable render. */
const MUST_BE_ZERO = [
  'scrollOverflow',
  'overflowingQuestions',
  'internallyOverflowingQuestions',
  'geometryCollisionCount',
  'geometryOutOfBoundsCount',
  'unlabeledGeometrySvgCount',
];

export const pageName = page => page.pageId ?? `page-${page.globalPage ?? '?'}`;

/** Problems that make a single rendered page unacceptable, independent of any baseline. */
export function pageHealthIssues(page) {
  const name = pageName(page);
  const issues = [];
  for (const key of MUST_BE_ZERO) {
    if (typeof page[key] === 'number' && page[key] > 0) issues.push(`${name}: ${key}=${page[key]} (must be 0)`);
  }
  if (page.headerContentOverlap) issues.push(`${name}: content overlaps the page header`);
  if (page.footerContentOverlap) issues.push(`${name}: content overlaps the page footer`);
  if (typeof page.usedSpanRatio === 'number' && page.usedSpanRatio > MAX_USED_SPAN_RATIO) {
    issues.push(`${name}: usedSpanRatio=${page.usedSpanRatio.toFixed(4)} — content runs past the page content area`);
  }
  return issues;
}

/** Problems that make a whole layout report unacceptable (to validate against, or to promote). */
export function reportHealthIssues(report) {
  const issues = [];
  if (report.pageCount !== EXPECTED_PAGES) issues.push(`pageCount=${report.pageCount}, expected ${EXPECTED_PAGES}`);
  if (!Array.isArray(report.layout) || report.layout.length !== EXPECTED_PAGES) {
    issues.push(`layout lists ${report.layout?.length} pages, expected ${EXPECTED_PAGES}`);
  }
  const mathJax = report.mathJaxStatus ?? {};
  if (mathJax.rendered !== mathJax.total || mathJax.svgNodes !== mathJax.total) {
    issues.push(`MathJax incomplete: total=${mathJax.total}, rendered=${mathJax.rendered}, svgNodes=${mathJax.svgNodes}`);
  }
  for (const page of report.layout ?? []) issues.push(...pageHealthIssues(page));
  return issues;
}

/** Every difference between the committed baseline and the current render, as readable lines. */
export function baselineDrift(baseline, current) {
  const drift = [];

  if (baseline.pageCount !== EXPECTED_PAGES || current.pageCount !== EXPECTED_PAGES) {
    drift.push(`expected ${EXPECTED_PAGES} pages, baseline=${baseline.pageCount}, current=${current.pageCount}`);
  }

  for (const key of ['total', 'rendered', 'svgNodes']) {
    if (baseline.mathJaxStatus?.[key] !== current.mathJaxStatus?.[key]) {
      drift.push(`MathJax ${key} drift: baseline=${baseline.mathJaxStatus?.[key]}, current=${current.mathJaxStatus?.[key]}`);
    }
  }

  for (let index = 0; index < baseline.layout.length; index += 1) {
    const expected = baseline.layout[index];
    const actual = current.layout[index];
    if (!actual) {
      drift.push(`page index ${index + 1}: missing current page`);
      continue;
    }

    const name = pageName(expected);

    for (const key of EXACT_KEYS) {
      if (JSON.stringify(expected[key]) !== JSON.stringify(actual[key])) {
        drift.push(`${name}: ${key} changed from ${JSON.stringify(expected[key])} to ${JSON.stringify(actual[key])}`);
      }
    }

    if (JSON.stringify(expected.footerLines) !== JSON.stringify(actual.footerLines)) {
      drift.push(`${name}: footerLines changed`);
    }

    for (const [key, tolerance] of Object.entries(TOLERANCES)) {
      const a = expected[key];
      const b = actual[key];
      if (a == null && b == null) continue;
      if (typeof a !== 'number' || typeof b !== 'number') {
        drift.push(`${name}: ${key} type/null drift`);
        continue;
      }
      const delta = Math.abs(a - b);
      if (delta > tolerance) {
        drift.push(`${name}: ${key} drift ${delta.toFixed(6)} exceeds ${tolerance} (baseline=${a}, current=${b})`);
      }
    }
  }

  if (current.layout.length !== baseline.layout.length) {
    drift.push(`layout page count changed: baseline=${baseline.layout.length}, current=${current.layout.length}`);
  }

  return drift;
}
