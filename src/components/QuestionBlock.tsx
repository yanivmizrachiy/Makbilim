import { type ReactNode } from 'react';
import { TASK_KIND_LABEL, taskKindById } from '../content/task-kinds';
import { DiagramSizeProvider, diagramSizeFor } from '../geometry/diagram-size';

export type QuestionBlockProps = {
  children: ReactNode;
  /**
   * Id of the original task (e.g. 'U2-P4-A'). Drives the student-facing task-type label and
   * the data-task-id / data-task-kind hooks, so any rendered question maps back to its content.
   */
  taskId?: string | undefined;
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
  taskId,
  diagram,
  subparts,
  answerLines = 0,
  justificationLabel,
  justificationLane = false,
  compact = false,
}: QuestionBlockProps) {
  const kind = taskId ? taskKindById(taskId) : undefined;

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
    <section className={blockClass} data-question-surface="premium" data-task-id={taskId} data-task-kind={kind}>
      <div className="question-marker" aria-hidden="true">●</div>
      <div className={contentClass}>
        <div className="question-stem">
          {kind && <span className="task-kind">{TASK_KIND_LABEL[kind]}</span>}
          {children}
        </div>
        {diagram && <div className="question-diagram"><DiagramSizeProvider size={diagramSizeFor({ taskId, kind, compact })}>{diagram}</DiagramSizeProvider></div>}
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
