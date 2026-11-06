import type { ReactNode } from 'react';

interface Props<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: ReactNode; icon?: string }[];
  onChange: (value: T) => void;
  /** Large tabs with a symbol above the label. */
  withIcons?: boolean;
}

/** A row of large toggle buttons; one is selected. */
export function Tabs<T extends string>({ label, value, options, onChange, withIcons = false }: Props<T>) {
  return (
    <div className={`tabs ${withIcons ? 'tabs--icons' : ''}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className={`tab ${o.value === value ? 'is-selected' : ''}`}
          aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.icon && <span className="tab-icon" aria-hidden="true">{o.icon}</span>}
          <span className="tab-label">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
