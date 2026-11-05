import type { ReactNode } from 'react';

interface Props<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
}

/** A row of large toggle buttons; one is selected. */
export function Tabs<T extends string>({ label, value, options, onChange }: Props<T>) {
  return (
    <div className="tabs" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className={`tab ${o.value === value ? 'is-selected' : ''}`}
          aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
