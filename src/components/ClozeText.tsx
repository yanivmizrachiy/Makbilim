import { Fragment } from 'react';
import { CLOZE_BLANK } from '../content/cloze';
import { MathText } from './MathText';

/**
 * Text with fill-in blanks. Each blank becomes a write-in slot (.cloze-blank in print.css, width
 * from --cloze-blank-width) announced to screen readers as a missing word; the text around it goes
 * through MathText, so any mathematics in the line is typeset as well.
 */
export function ClozeText({ text }: { text: string }) {
  return (
    <>
      {text.split(CLOZE_BLANK).map((part, index) => (
        <Fragment key={index}>
          {index > 0 && <><span className="cloze-blank" aria-hidden="true" /><span className="sr-only">מילה חסרה</span></>}
          <MathText text={part} />
        </Fragment>
      ))}
    </>
  );
}
