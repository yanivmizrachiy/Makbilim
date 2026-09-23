export const printTokens = {
  page: {
    widthMm: 210,
    heightMm: 297,
    numbering: 'reset-per-unit' as const,
    firstPageInUnit: 1,
  },
  markers: {
    question: {
      glyph: '●',
      sizeEm: 0.82,
      role: 'large-solid-bullet' as const,
      ariaLabel: 'שאלה',
    },
    subpart: {
      glyph: '•',
      sizeEm: 0.50,
      role: 'small-solid-bullet' as const,
      ariaLabel: 'סעיף',
    },
    numbering: 'none' as const,
  },
  footer: {
    line1: 'יניב רז - מדריך מחוזי חט"ב בעיר ירושלים',
    line2: 'הדרכה במחוז ירושלים והעיר ירושלים - מנח"י, בהובלת איילת קריספין',
  },
} as const;

export type PrintTokens = typeof printTokens;

/**
 * Geometry tokens — the ONE source of every diagram size, weight and label size.
 *
 * Diagrams are laid out at a fixed PHYSICAL scale: one SVG user unit is one CSS px
 * (1/96 in), so every length below prints at exactly its stated size. The drawing (gap
 * between the lines, line lengths) adapts to the diagram's size class; labels, strokes,
 * arcs and dots never do. geometry-premium.css mirrors the CSS-facing values as
 * --geo-* custom properties (locked equal by tests/unit/geometry-engine.test.ts).
 */
export const geometryTokens = {
  pxPerMm: 96 / 25.4,
  pxPerPt: 96 / 72,
  /**
   * Size classes: the box a diagram may fill (height x max width, mm) and the nominal gap
   * between its parallel lines at geometry scale 1. The engine draws the largest figure that
   * fits the box, at a geometry scale of at least `minGeometryScale`.
   *  - compact: diagram column of the split question layout (61 mm column)
   *  - full:    diagram below a full-width stem
   *  - mark:    identification / mark-on-diagram tasks: the diagram IS the answer surface (78 mm column)
   *  - pair:    each of two side-by-side figures (claim / counterexample)
   *  - densePair: a side-by-side figure in a dense question
   *  - table:   a figure inside a table row
   *  - dense:   a split-layout figure on a page that would otherwise clip
   */
  size: {
    compact: { heightMm: 40, maxWidthMm: 61, nominalGapMm: 17, maxScale: 1.45 },
    full: { heightMm: 54, maxWidthMm: 92, nominalGapMm: 22, maxScale: 1.45 },
    mark: { heightMm: 50, maxWidthMm: 78, nominalGapMm: 21, maxScale: 1.45 },
    pair: { heightMm: 36, maxWidthMm: 70, nominalGapMm: 15, maxScale: 1.45 },
    densePair: { heightMm: 29, maxWidthMm: 70, nominalGapMm: 12, maxScale: 1.3 },
    table: { heightMm: 26, maxWidthMm: 50, nominalGapMm: 9, maxScale: 1.1 },
    dense: { heightMm: 32, maxWidthMm: 61, nominalGapMm: 12, maxScale: 1.3 },
  },
  minGeometryScale: 0.8,
  /** Stroke weights (mm). Mirrored as --geo-stroke-*. */
  stroke: { lineMm: 0.4, arcMm: 0.35, arcAuxMm: 0.3, chevronMm: 0.35, leaderMm: 0.2 },
  /** Dash pattern of the auxiliary / explicitly dashed arc — the only dashed element (mm). */
  dashAuxMm: [0.9, 0.6],
  /** Label type sizes (pt) and the white knockout halo (mm, full stroke width). */
  label: { anglePt: 9.5, linePt: 9.5, indexPt: 9, minPt: 8.5, haloMm: 0.7 },
  /** Angle arcs (mm / degrees). */
  arc: { radiusMm: 4.6, doubleGapMm: 1.0, acuteBoostMm: 1.2, acuteBelowDeg: 40, trimDeg: 0.5 },
  /** Solid intersection dot (mm). */
  dotRadiusMm: 0.5,
  /** Parallel chevrons: two '>' marks (mm); the line runs on at least runOnMm past them. */
  chevron: { lengthMm: 1.9, halfHeightMm: 1.15, pitchMm: 1.3, clearFromArcMm: 1.6, runOnMm: 3.2 },
  /** A transversal extends this far past its outermost intersection (mm). */
  transversalOverhangMm: 7,
  /** A given line extends at least / at most this far past its outermost intersection (mm). */
  lineOverhangMm: { min: 6, max: 24 },
  /** Two crossings on the same line are never closer than this (mm). */
  minIntersectionSpacingMm: 6,
  /** Label placement (mm): gap outside the outer arc, max distance before a leader, line clearance. */
  placement: {
    gapFromArcMm: 0.9,
    maxBeyondArcMm: 6.5,
    leaderReachMm: 16,
    lineClearanceMm: 0.8,
    labelGapMm: 0.8,
    sectorMarginDeg: 4,
    lineLabelOffsetMm: 1.1,
  },
  /** Blank margin kept around the fitted drawing inside its viewBox (mm). */
  insetMm: 0.6,
} as const;

export type GeometryTokens = typeof geometryTokens;
export type DiagramSize = keyof typeof geometryTokens.size;
