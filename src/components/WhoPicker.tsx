import type { Person } from '../data/types';
import { Avatar } from './Avatar';
import { Tabs } from './Tabs';

/** "Both / Astrid / Ethan": a child can show just their own list, or everyone's side by side. */
export function WhoPicker({ children, value, onChange }: { children: Person[]; value: string; onChange: (v: string) => void }) {
  if (children.length < 2) return null;
  return (
    <Tabs<string> label="Whose list" value={value} onChange={onChange}
      options={[
        { value: 'all', label: <>👫 {children.length === 2 ? 'Both' : 'Everyone'}</> },
        ...children.map((c) => ({ value: c.id, label: <><Avatar name={c.name} colour={c.colour} image={c.avatar} size={30} /> {c.name}</> })),
      ]} />
  );
}
