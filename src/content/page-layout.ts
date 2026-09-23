/**
 * Page density presets — the ONLY per-page layout tuning in the booklet.
 *
 * A4Page writes the page's preset to `data-density`; src/styles/page-tuning.css maps each preset to
 * token values (custom properties only). A page is marked 'dense' only when its content would not
 * otherwise fit the A4 content area; the dense preset keeps the handwriting pitch at 7mm or more.
 */
export type PageDensity = 'regular' | 'dense';

export const PAGE_DENSITY: Readonly<Record<string, PageDensity>> = {
  'U1-P4': 'dense',
  'U2-P4': 'dense',
  'U3-P3': 'dense',
  'U4-P2': 'dense',
};

export const pageKey = (unit: number, page: number) => `U${unit}-P${page}`;

export function pageDensity(unit: number, page: number): PageDensity {
  return PAGE_DENSITY[pageKey(unit, page)] ?? 'regular';
}
