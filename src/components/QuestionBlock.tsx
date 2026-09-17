import React, { type ReactNode } from 'react';

export type QuestionBlockProps = {
  children: ReactNode;
  diagram?: ReactNode | undefined;
  subparts?: ReactNode[] | undefined;
  answerLines?: number | undefined;
  justificationLabel?: string | undefined;
  justificationLane?: boolean | undefined;
  compact?: boolean | undefined;
};

function AnswerLines({ count = 1 }: { count?: number | undefined }) {
  return (
    <div className="answer-lines" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => <span key={index} />)}
    </div>
  );
}

export function QuestionBlock({
  children,
  diagram,
  subparts,
  answerLines = 0,
  justificationLabel,
  justificationLane = false,
  compact = false,
}: QuestionBlockProps) {
  const blockClass = [
    'question-block',
    compact ? 'question-block--compact' : '',
    diagram ? 'question-block--with-diagram' : '',
  ].filter(Boolean).join(' ');

  const contentClass = [
    'question-content',
    compact && diagram ? 'question-content--split' : '',
  ].filter(Boolean).join(' ');

  return (
    <section className={blockClass} data-question-surface="premium">
      <div className="question-marker" aria-hidden="true">●</div>
      <div className={contentClass}>
        <div className="question-stem">{children}</div>
        {diagram && <div className="question-diagram">{diagram}</div>}
        {subparts && subparts.length > 0 && (
          <div className="subparts">
            {subparts.map((part, index) => (
              <div className="subpart" key={index}>
                <span className="subpart-marker" aria-hidden="true">•</span>
                <div className="subpart-content">{part}</div>
              </div>
            ))}
          </div>
        )}
        {answerLines > 0 && <AnswerLines count={answerLines} />}
        {justificationLane && (
          <div className="justification-lane">
            <span className="justification-label">{justificationLabel ?? 'נימוק:'}</span>
            <span className="justification-write-line" aria-hidden="true" />
          </div>
        )}
      </div>
    </section>
  );
}
