import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SyntheticEvent } from 'react';
import type { Step } from '../data/types';
import { StepImage } from './StepImage';

interface Props {
  step: Step;
  index: number;
  count: number;
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
}

/** Stops a press on a button from also starting a drag of the row. */
const stop = (e: SyntheticEvent) => e.stopPropagation();
const noDrag = { onPointerDown: stop, onMouseDown: stop, onTouchStart: stop, onKeyDown: stop };

/** One step in edit mode: press-and-hold anywhere on the row to drag, or use the arrows. */
export function EditStep({ step, index, count, onUp, onDown, onDelete }: Props) {
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
      <StepImage image={step.image} />
      <span className="step-title">{step.title}</span>
      <span className="edit-buttons">
        <button type="button" className="icon-btn" {...noDrag} onClick={onUp} disabled={index === 0}
          aria-label={`Move ${step.title} up`}>▲</button>
        <button type="button" className="icon-btn" {...noDrag} onClick={onDown} disabled={index === count - 1}
          aria-label={`Move ${step.title} down`}>▼</button>
        <button type="button" className="icon-btn icon-btn--delete" {...noDrag} onClick={onDelete}
          aria-label={`Delete ${step.title}`}>✕</button>
      </span>
    </li>
  );
}
