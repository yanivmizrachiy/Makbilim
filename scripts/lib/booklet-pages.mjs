/**
 * The booklet's page order for scripts — read from src/content/booklet-pages.json, the ONE source
 * of the printed order (booklet.ts derives the same from the same file). Scripts never restate the
 * order or the counts; they derive them here.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(here, '..', '..', 'src', 'content', 'booklet-pages.json');

/** @type {{ id: string, topic: string, curriculum?: boolean }[]} */
export const BOOKLET_PAGES = JSON.parse(fs.readFileSync(source, 'utf8')).pages;

/** All student pages, in printed order (global page = index + 1). */
export const EXPECTED_PAGES = BOOKLET_PAGES.length;
/** The verbatim curriculum pages (printed first). */
export const CURRICULUM_PAGE_COUNT = BOOKLET_PAGES.filter(page => page.curriculum).length;
/** The authored pages (the original booklet, renumbered). */
export const AUTHORED_PAGE_COUNT = EXPECTED_PAGES - CURRICULUM_PAGE_COUNT;

/** Global page number (1..N) of a page id, or -1. */
export const globalPageNumber = pageId => BOOKLET_PAGES.findIndex(page => page.id === pageId) + 1;
