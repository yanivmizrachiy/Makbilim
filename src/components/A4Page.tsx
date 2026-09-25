import { type ReactNode } from 'react';
import { globalPageNumber, isCurriculumPage, topicOf } from '../content/booklet';
import { pageDensity } from '../content/page-layout';
import { printTokens } from '../styles/tokens';
import districtLogo from '../assets/district-logo.png';

export type A4PageProps = {
  projectTitle?: string;
  /** Internal, stable page id (e.g. 'U2-P4' or 'C-P1'); drives the global page number, topic and density. */
  pageId: string;
  children: ReactNode;
  className?: string;
};

/**
 * One A4 sheet (SPEC 4.1/4.3/11.6): the header (the booklet subject is the title — no topic/unit
 * meta-label; the CONTINUOUS global page number sits in a circle at the far, top-left corner),
 * the content area and the canonical two-line footer. No "יחידה N" anywhere. The header/footer
 * TEXTS are canonical (the visual baseline compares them); only their typography lives in CSS.
 */
export function A4Page({
  projectTitle = 'זוויות בין ישרים מקבילים',
  pageId,
  children,
  className = '',
}: A4PageProps) {
  const pageNumber = globalPageNumber(pageId);
  const topic = topicOf(pageId);
  const curriculum = isCurriculumPage(pageId);
  return (
    <article
      className={`a4-page ${className}`.trim()}
      data-page-id={pageId}
      data-page={pageNumber}
      data-topic={topic}
      {...(curriculum ? { 'data-curriculum': 'true' } : {})}
      data-density={pageDensity(pageId)}
      data-layout-quality="premium"
      dir="rtl"
    >
      <header className="page-header">
        <div className="page-title-group">
          {/* The booklet's own subject is the header title. Didactic pages carry no topic meta-label;
             curriculum pages name their source — „שאלות מתוך תוכנית הלימודים” (SPEC 1 / 4.3 / 11.5). */}
          <h1>{projectTitle}</h1>
          {curriculum && <p className="topic-title">{topic}</p>}
        </div>
        <div className="page-number" aria-label={`עמוד ${pageNumber}`}>{pageNumber}</div>
      </header>

      <div className="page-content" role="group" aria-label={`תוכן עמוד ${pageNumber}`}>{children}</div>

      <footer className="page-footer">
        <img className="footer-logo" src={districtLogo} alt="" aria-hidden="true" />
        <div className="footer-text">
          <div>{printTokens.footer.line1}</div>
          <div>{printTokens.footer.line2}</div>
        </div>
      </footer>
    </article>
  );
}
