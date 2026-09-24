/**
 * Conclusion arrow (SPEC 11.14): the single, shared downward arrow (↓) for every graded deduction
 * — the converse scaffolding, guided derivations and "לכן …" steps. It is drawn as inline SVG (not
 * a font glyph), so it renders identically in Chromium and Vivliostyle, never depends on a glyph
 * that a PDF engine might drop, and never mirrors under RTL bidi. One size and weight, from tokens.
 */
export function ConclusionArrow({ label = 'לכן' }: { label?: string }) {
  return (
    <div className="conclusion-arrow" role="presentation">
      <svg className="conclusion-arrow-svg" viewBox="0 0 12 22" width="12" height="22" aria-hidden="true" focusable="false" shapeRendering="geometricPrecision">
        <line x1="6" y1="1.5" x2="6" y2="16.5" />
        <polyline points="1.5,12 6,20 10.5,12" fill="none" />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}
