import { useEffect, useState } from 'react';
import { BOOKLET_PAGES, CURRICULUM_QUESTION_IDS } from '../content/booklet';
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
        if (data.immutable !== true || data.blockCount !== CURRICULUM_QUESTION_IDS.length || data.blocks.length !== CURRICULUM_QUESTION_IDS.length) {
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

  // The curriculum pages and how many blocks each holds come from booklet-pages.json (one source).
  const curriculumPages = BOOKLET_PAGES.filter(page => page.curriculum);
  const perPage = Math.ceil(source.blocks.length / curriculumPages.length);
  const pages = curriculumPages.map((_, pageIndex) => source.blocks.slice(pageIndex * perPage, (pageIndex + 1) * perPage));

  return (
    <>
      {pages.map((blocks, pageIndex) => (
        <A4Page
          key={curriculumPages[pageIndex]!.id}
          pageId={curriculumPages[pageIndex]!.id}
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
