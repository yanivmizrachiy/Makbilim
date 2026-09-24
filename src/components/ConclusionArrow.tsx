/**
 * Conclusion arrow (SPEC 11.14): the single, shared downward DOUBLE arrow (⇓) for every graded
 * deduction — the converse scaffolding, guided derivations and "לכן …" steps. Two parallel shafts
 * meet one chevron head. It is drawn as inline SVG (not a font glyph), so it renders identically in
 * Chromium and Vivliostyle, never depends on a glyph a PDF engine might drop, and never mirrors
 * under RTL bidi. One size and weight, from tokens.
 */
export function ConclusionArrow({ label = 'לכן' }: { label?: string }) {
  return (
    <div className="conclusion-arrow" role="presentation">
      <svg className="conclusion-arrow-svg" viewBox="0 0 16 22" width="16" height="22" aria-hidden="true" focusable="false" shapeRendering="geometricPrecision">
        <line x1="6.3" y1="1.5" x2="6.3" y2="13" />
        <line x1="9.7" y1="1.5" x2="9.7" y2="13" />
        <polyline points="2.5,11.5 8,20 13.5,11.5" fill="none" />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}
