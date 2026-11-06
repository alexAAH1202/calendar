import { useState } from 'react';
import type { Person } from '../data/types';
import { ChoreBoard } from './ChoreBoard';
import { ChoresSection } from './ChoresSection';

/** The Chores tab: today's chores to tick, and a switch to add and change them. */
export function ChoresView({ children, day }: { children: Person[]; day: string }) {
  const [editing, setEditing] = useState(false);
  return (
    <>
      <div className="editor-row editor-row--end">
        <button type="button" className={editing ? 'btn btn--primary' : 'btn'} aria-pressed={editing} onClick={() => setEditing((e) => !e)}>
          {editing ? 'Done editing' : '✏️ Edit chores'}
        </button>
      </div>
      {editing ? (
        <section className="edit-surface" aria-label="Edit chores"><ChoresSection children={children} today={day} /></section>
      ) : (
        <ChoreBoard children={children} day={day} />
      )}
    </>
  );
}
