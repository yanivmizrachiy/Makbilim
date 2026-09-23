/**
 * Fill-in blank convention of the content: a run of three or more underscores marks one missing
 * word (completion drills) or a value to write in. The page renderers (components/ClozeText.tsx)
 * and the answer key read blanks through this single definition.
 */
export const CLOZE_BLANK = /_{3,}/;

/** The line with its blank filled by `word`. */
export function fillBlank(line: string, word: string): string {
  return line.replace(CLOZE_BLANK, word);
}
