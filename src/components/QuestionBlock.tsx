import { type ReactNode } from 'react';
import { answerSpecById, growOf } from '../content/answer-areas';
import { taskKindById } from '../content/task-kinds';
import { DiagramSizeProvider, diagramSizeFor } from '../geometry/diagram-size';
import { AnswerArea, AnswerSlots } from './AnswerArea';

/** A sub-item: its content, an optional answer beside it (a verdict) and an optional row under it. */
export type SubpartItem = {
  content: ReactNode;
  /** Set beside the statement, in the verdict column (e.g. ○ נכון ○ לא נכון). */
  aside?: ReactNode;
  /** Set under the statement (e.g. its 'נימוק:' writing row). */
  after?: ReactNode;
  /** The content is one line that ends in a write-in slot (claim → reason, pair → word). */
  inline?: boolean;
};

export type QuestionBlockProps = {
  /** The instruction (stem), plus anything that belongs directly to it: choices, a bank, a table. */
  children: ReactNode;
  /**
   * Id of the original task (e.g. 'U2-P4-A'). Drives the answer area (content/answer-areas.ts) and
   * the data-task-id / data-task-kind hooks. It is never shown to the student.
   */
  taskId: string;
  /** An explanatory note (e.g. the parallel-arrows convention), set apart from the instruction. */
  hint?: ReactNode | undefined;
  /** A comic (two students arguing a claim), set right after the instruction. */
  comic?: ReactNode | undefined;
  diagram?: ReactNode | undefined;
  /** 'side': the diagram in its own column beside the text; 'stacked': under the stem (paired figures). */
  diagramLayout?: 'side' | 'stacked' | undefined;
  subparts?: ReactNode[] | undefined;
  items?: SubpartItem[] | undefined;
  /** Response material that follows the sub-items (e.g. the table the sub-items explain). */
  response?: ReactNode | undefined;
  compact?: boolean | undefined;
};

function Subpart({ item }: { item: SubpartItem }) {
  const className = [
    'subpart',
    item.aside ? 'subpart--aside' : '',
    item.inline ? 'subpart--inline' : '',
  ].filter(Boolean).join(' ');
  return (
    <div className={className}>
      {/* SPEC 4.2 / 11.5: a sub-part opens with a small filled dot •, never a letter or a number. */}
      <span className="subpart-marker"><span className="sr-only">סעיף: </span><span aria-hidden="true">•</span></span>
      <div className="subpart-content">{item.content}</div>
      {item.aside && <div className="subpart-aside">{item.aside}</div>}
      {item.after && <div className="subpart-after">{item.after}</div>}
    </div>
  );
}

/**
 * One question on the white page (SPEC 11.5 / 11.7): a large filled dot ● opens the question, then
 * one text column that reads stem → sub-items / choices → answer slots → work area, with the diagram
 * in its own column beside it. Questions are NOT numbered (only pages are, SPEC 4.1) and carry no
 * task-type label — the instruction itself says what to do. The block's grow weight comes from its
 * answer spec, so surplus page height becomes whole writing rules where the student writes.
 */
export function QuestionBlock({
  children,
  taskId,
  hint,
  comic,
  diagram,
  diagramLayout = 'side',
  subparts,
  items,
  response,
  compact = false,
}: QuestionBlockProps) {
  const kind = taskKindById(taskId);
  const spec = answerSpecById(taskId);
  const side = Boolean(diagram) && diagramLayout === 'side';
  // The diagram's size class (geometryTokens.size) is chosen here once, from data: a figure beside
  // the text is 'compact' ('mark' for identification, 'dense' on the tightest pages); stacked is 'full'.
  const sized = diagram && (
    <DiagramSizeProvider size={diagramSizeFor({ taskId, kind, compact: side })}>{diagram}</DiagramSizeProvider>
  );
  const allItems: SubpartItem[] = [...(subparts ?? []).map(content => ({ content })), ...(items ?? [])];

  const blockClass = [
    'question-block',
    compact ? 'question-block--compact' : '',
    diagram ? 'question-block--with-diagram' : '',
  ].filter(Boolean).join(' ');

  const contentClass = ['question-content', side ? 'question-content--split' : ''].filter(Boolean).join(' ');

  return (
    <section
      className={blockClass}
      data-question-surface="premium"
      data-task-id={taskId}
      data-task-kind={kind}
      data-answer-mode={spec.mode}
      data-grow={growOf(spec)}
    >
      <div className="question-marker"><span className="sr-only">שאלה</span><span aria-hidden="true">●</span></div>
      <div className={contentClass}>
        <div className="question-main">
          <div className="question-stem">{children}</div>
          {hint && (
            <aside className="hint-note" role="note">
              <span className="hint-note-icon" aria-hidden="true">ⓘ</span>
              <span className="hint-note-text">{hint}</span>
            </aside>
          )}
          {comic}
          {diagram && !side && <div className="question-diagram question-diagram--stacked">{sized}</div>}
          {allItems.length > 0 && (
            <div className="subparts">
              {allItems.map((item, index) => <Subpart item={item} key={index} />)}
            </div>
          )}
          {response}
          <AnswerSlots taskId={taskId} />
          <AnswerArea taskId={taskId} />
        </div>
        {side && <div className="question-diagram">{sized}</div>}
      </div>
    </section>
  );
}
