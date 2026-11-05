import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode, SyntheticEvent } from 'react';
/** Anything with an id, a title and an optional symbol: routine steps, chores. */
export interface ListItem {
  id: string;
  title: string;
  image?: string;
}
import { StepImage } from './StepImage';

interface Props {
  step: ListItem;
  /** A small second line, e.g. "Every week · next Mon 9 Nov". */
  meta?: string;
  index: number;
  count: number;
  expanded: boolean;
  onUp: () => void;
  onDown: () => void;
  onToggleMore: () => void;
  onPickEmoji: () => void;
  /** Shown under the row when "⋯" is open: move to another time, delete. */
  actions: ReactNode;
}

/** Stops a press on a button from also starting a drag of the row. */
const stop = (e: SyntheticEvent) => e.stopPropagation();
export const noDrag = { onPointerDown: stop, onMouseDown: stop, onTouchStart: stop, onKeyDown: stop };

/** One step in edit mode: press-and-hold anywhere on the row to drag, or use the arrows. */
export function EditStep({ step, meta, index, count, expanded, onUp, onDown, onToggleMore, onPickEmoji, actions }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });

  return (
    <li
      ref={setNodeRef}
      className={`step step--edit ${isDragging ? 'step--dragging' : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-roledescription="sortable step"
      aria-label={`${step.title}, position ${index + 1} of ${count}. Hold to drag.`}
    >
      <span className="drag-handle" aria-hidden="true">⠿</span>
      <button type="button" className="emoji-button emoji-button--step" {...noDrag} onClick={onPickEmoji}
        aria-label={`Change the symbol for ${step.title}`}>
        <StepImage image={step.image} />
      </button>
      <span className="step-title">
        {step.title}
        {meta && <span className="step-meta">{meta}</span>}
      </span>
      <span className="edit-buttons">
        <button type="button" className="icon-btn" {...noDrag} onClick={onUp} disabled={index === 0}
          aria-label={`Move ${step.title} up`}>▲</button>
        <button type="button" className="icon-btn" {...noDrag} onClick={onDown} disabled={index === count - 1}
          aria-label={`Move ${step.title} down`}>▼</button>
        <button type="button" className="icon-btn" {...noDrag} onClick={onToggleMore} aria-expanded={expanded}
          aria-label={`More for ${step.title}`}>⋯</button>
      </span>
      {expanded && <div className="step-actions" {...noDrag}>{actions}</div>}
    </li>
  );
}
