import type { ReactNode } from 'react';

export const fieldNoteId = (id: string) => `${id}-note`;

export const ApplicationField = ({
  id,
  label,
  isOptional = false,
  optionalLabel,
  hint,
  error,
  aside,
  children,
}: {
  id: string;
  label: string;
  isOptional?: boolean;
  optionalLabel: string;
  hint?: ReactNode;
  error?: string | null;
  aside?: ReactNode;
  children: ReactNode;
}) => (
  <div>
    <label className="text-label" htmlFor={id}>
      {label}
      {isOptional ? (
        <span className="ms-1.5 text-neutral">
          ({optionalLabel.toLowerCase()})
        </span>
      ) : null}
    </label>
    <div className="mt-1.5">{children}</div>
    {error || hint || aside ? (
      <div className="mt-1.5 flex items-start justify-between gap-3 text-body-sm">
        {error ? (
          <p className="text-error" id={fieldNoteId(id)}>
            {error}
          </p>
        ) : hint ? (
          <p className="text-neutral" id={fieldNoteId(id)}>
            {hint}
          </p>
        ) : (
          <span />
        )}
        {aside}
      </div>
    ) : null}
  </div>
);
