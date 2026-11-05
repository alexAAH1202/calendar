import type { Person, TimeOfDay } from '../data/types';
import { ChildColumn } from './ChildColumn';

/** The wall: one column per child, side by side, in a fixed order. */
export function ChildBoard({ children, day, tod }: { children: Person[]; day: string; tod: TimeOfDay }) {
  if (children.length === 0) {
    return <p className="hint">No children yet. Add one in Parent mode.</p>;
  }
  return (
    <div className="child-board" style={{ gridTemplateColumns: `repeat(${children.length}, minmax(0, 1fr))` }}>
      {children.map((p) => (
        <ChildColumn key={`${p.id}_${tod}`} person={p} day={day} tod={tod} />
      ))}
    </div>
  );
}
