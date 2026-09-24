/** Type declarations for visual-baseline-contract.mjs (the repo compiles with allowJs: false). */

export type LayoutPage = Record<string, unknown> & { pageId: string; globalPage: number };

export type LayoutReport = {
  pageCount: number;
  mathJaxStatus?: { total?: number; rendered?: number; svgNodes?: number };
  layout: LayoutPage[];
};

export declare const EXPECTED_PAGES: number;
export declare const EXACT_KEYS: readonly string[];
export declare const TOLERANCES: Readonly<Record<string, number>>;
export declare const MAX_USED_SPAN_RATIO: number;
export declare function pageName(page: { pageId?: string; globalPage?: number }): string;
export declare function pageHealthIssues(page: LayoutPage): string[];
export declare function reportHealthIssues(report: LayoutReport): string[];
export declare function baselineDrift(baseline: LayoutReport, current: LayoutReport): string[];
