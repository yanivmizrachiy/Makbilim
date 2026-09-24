import { Fragment } from 'react';
import { CLOZE_BLANK } from '../content/cloze';
import { MathText } from './MathText';

/**
 * Text with fill-in blanks. Each blank becomes a write-in slot (.cloze-blank in print.css, width
 * from --cloze-blank-width) announced to screen readers as a missing word; the text around it goes
 * through MathText, so any mathematics in the line is typeset as well.
 */
export function ClozeText({ text }: { text: string }) {
  const parts = text.split(CLOZE_BLANK);
  // The last word before each blank ('ל־', 'זוויות') and the punctuation right after it stay on the
  // blank's line (no orphaned '.', no 'ל־' ending a line without its blank).
  const lead = parts.map((part, index) => (index > 0 ? /^[.,:;!?]*/.exec(part)![0] : ''));
  return (
    <>
      {parts.map((part, index) => {
        const body = part.slice(lead[index]!.length);
        const tail = index < parts.length - 1 ? /\S*\s*$/.exec(body)![0] : '';
        const head = body.slice(0, body.length - tail.length);
        return (
          <Fragment key={index}>
            {head && <MathText text={head} />}
            {index < parts.length - 1 && (
              <span className="cloze-unit">
                {tail && <MathText text={tail} />}
                <span className="cloze-blank" aria-hidden="true" /><span className="sr-only">מילה חסרה</span>
                {lead[index + 1] && <MathText text={lead[index + 1]!} />}
              </span>
            )}
          </Fragment>
        );
      })}
    </>
  );
}
