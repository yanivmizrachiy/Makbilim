import React, { useEffect, useState } from 'react';
import { A4Page } from '../components/A4Page';

type CurriculumBlock = {
  id: string;
  section: string;
  question: number;
  reason: string;
  html: string;
  htmlSha256: string;
};

type CurriculumRendered = {
  immutable: true;
  blockCount: number;
  blocks: CurriculumBlock[];
};

export function Unit5Pages() {
  const [source, setSource] = useState<CurriculumRendered | null>(null);

  useEffect(() => {
    let active = true;
    fetch('./generated/curriculum-rendered.json', { cache: 'no-store' })
      .then(response => {
        if (!response.ok) throw new Error(`Failed to load curriculum source: ${response.status}`);
        return response.json() as Promise<CurriculumRendered>;
      })
      .then(data => {
        if (data.immutable !== true || data.blockCount !== 8 || data.blocks.length !== 8) {
          throw new Error('Curriculum source integrity mismatch');
        }
        if (active) setSource(data);
      })
      .catch(error => {
        queueMicrotask(() => { throw error; });
      });
    return () => { active = false; };
  }, []);

  if (!source) return null;

  const pages = Array.from({ length: 4 }, (_, pageIndex) =>
    source.blocks.slice(pageIndex * 2, pageIndex * 2 + 2)
  );

  return (
    <>
      {pages.map((blocks, pageIndex) => (
        <A4Page
          key={`curriculum-page-${pageIndex + 1}`}
          unitNumber={5}
          unitTitle="שאלות מתוך תוכנית הלימודים"
          pageNumber={pageIndex + 1}
          className="curriculum-source-page"
        >
          <div className="bbb-source" data-curriculum-ready="true">
            {blocks.map(block => (
              <section
                className="bbb-source-block"
                key={block.id}
                data-source-id={block.id}
                data-source-sha256={block.htmlSha256}
                dangerouslySetInnerHTML={{ __html: block.html }}
              />
            ))}
          </div>
        </A4Page>
      ))}
    </>
  );
}
