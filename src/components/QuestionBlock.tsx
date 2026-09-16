import React, { type ReactNode } from 'react';

export type QuestionBlockProps = {
  children: ReactNode;
  diagram?: ReactNode;
  subparts?: ReactNode[];
  answerLines?: number;
  justificationLabel?: string;
  justificationLane?: boolean;
  compact?: boolean;
};

function AnswerLines({ count = 1 }: { count?: number }) {
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
  return (
    <section className={`question-block${compact ? ' question-block--compact' : ''}`}>
      <div className="question-marker" aria-hidden="true">●</div>
      <div className="question-content">
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
