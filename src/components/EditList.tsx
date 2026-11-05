import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Step } from '../data/types';
import { EditStep } from './EditStep';

/** A drag starts only after a ~250 ms press; moving more than 8 px first counts as a scroll. */
export const HOLD_TO_DRAG = { delay: 250, tolerance: 8 } as const;

interface Props {
  steps: Step[];
  onDragMove: (activeId: string, overId: string) => void;
  onUp: (id: string) => void;
  onDown: (id: string) => void;
  onDelete: (id: string) => void;
  onPickEmoji: (id: string) => void;
}

export function EditList({ steps, onDragMove, onUp, onDown, onDelete, onPickEmoji }: Props) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: HOLD_TO_DRAG }),
    useSensor(TouchSensor, { activationConstraint: HOLD_TO_DRAG }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) onDragMove(String(active.id), String(over.id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <ol className="steps">
          {steps.map((step, i) => (
            <EditStep
              key={step.id}
              step={step}
              index={i}
              count={steps.length}
              onUp={() => onUp(step.id)}
              onDown={() => onDown(step.id)}
              onDelete={() => onDelete(step.id)}
              onPickEmoji={() => onPickEmoji(step.id)}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
