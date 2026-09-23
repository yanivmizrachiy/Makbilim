import { type ReactNode } from 'react';
import { answerSpecById, growOf } from '../content/answer-areas';
import { globalQuestionNumber } from '../content/booklet';
import { TASK_KIND_LABEL, taskKindById } from '../content/task-kinds';
import { DiagramSizeProvider, diagramSizeFor } from '../geometry/diagram-size';
import { AnswerArea, AnswerSlots } from './AnswerArea';

/** Local sub-part letters (SPEC 4.2/11.5): sub-parts are lettered א, ב, ג… within their question. */
const SUBPART_LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'כ', 'ל'] as const;

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
   * Id of the original task (e.g. 'U2-P4-A'). Drives the student-facing task-type label, the answer
   * area (content/answer-areas.ts) and the data-task-id / data-task-kind hooks.
   */
  taskId: string;
  diagram?: ReactNode | undefined;
  /** 'side': the diagram in its own column beside the text; 'stacked': under the stem (paired figures). */
  diagramLayout?: 'side' | 'stacked' | undefined;
  subparts?: ReactNode[] | undefined;
  items?: SubpartItem[] | undefined;
  /** Response material that follows the sub-items (e.g. the table the sub-items explain). */
  response?: ReactNode | undefined;
  compact?: boolean | undefined;
};

function Subpart({ item, letter }: { item: SubpartItem; letter: string }) {
  const className = [
    'subpart',
    item.aside ? 'subpart--aside' : '',
    item.inline ? 'subpart--inline' : '',
  ].filter(Boolean).join(' ');
  return (
    <div className={className}>
      <span className="subpart-marker">{letter}</span>
      <div className="subpart-content">{item.content}</div>
      {item.aside && <div className="subpart-aside">{item.aside}</div>}
      {item.after && <div className="subpart-after">{item.after}</div>}
    </div>
  );
}

/**
 * One question on the white page (SPEC 11.5 / 11.7): the ● marker, then one text column that reads
 * stem → sub-items / choices → answer slots → work area, with the diagram in its own column beside it.
 * The block's grow weight comes from its answer spec, so surplus page height becomes whole writing
 * rules where the student writes, never empty bands.
 */
export function QuestionBlock({
  children,
  taskId,
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
      <div className="question-marker"><span className="sr-only">שאלה </span>{globalQuestionNumber(taskId)}</div>
      <div className={contentClass}>
        <div className="question-main">
          <div className="question-stem">
            <span className="task-kind">{TASK_KIND_LABEL[kind]}</span>
            {children}
          </div>
          {diagram && !side && <div className="question-diagram question-diagram--stacked">{sized}</div>}
          {allItems.length > 0 && (
            <div className="subparts">
              {allItems.map((item, index) => <Subpart item={item} letter={SUBPART_LETTERS[index] ?? String(index + 1)} key={index} />)}
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
