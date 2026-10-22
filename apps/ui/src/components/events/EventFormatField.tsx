import { useId } from 'react';

import { EVENT_FORMATS, type EventFormat } from '@founders-coffee/core';
import {
  host_format_hybrid,
  host_format_hybrid_hint,
  host_format_in_person,
  host_format_in_person_hint,
  host_format_label,
  host_format_online,
  host_format_online_hint,
  type Locale,
} from '@founders-coffee/i18n';

const NAMES = {
  in_person: host_format_in_person,
  online: host_format_online,
  hybrid: host_format_hybrid,
} as const;

const HINTS = {
  in_person: host_format_in_person_hint,
  online: host_format_online_hint,
  hybrid: host_format_hybrid_hint,
} as const;

export const EventFormatField = ({
  locale,
  value,
  isDisabled = false,
  onChange,
}: {
  locale: Locale;
  value: EventFormat;
  isDisabled?: boolean;
  onChange: (next: EventFormat) => void;
}) => {
  const name = useId();
  const hintId = `${name}-hint`;
  return (
    <fieldset aria-describedby={hintId} className="flex flex-col">
      <legend className="mb-1.5 text-body-sm text-neutral">
        {host_format_label({}, { locale })}
      </legend>
      <div className="flex flex-wrap gap-2">
        {EVENT_FORMATS.map((format) => (
          <label
            className="tap-target inline-flex h-8 cursor-pointer items-center rounded-full bg-base-200 px-3.5 text-body-sm font-medium text-base-content transition-colors duration-[var(--duration-fast)] hover:bg-base-300 has-[:checked]:bg-secondary-tint has-[:checked]:text-accent has-[:checked]:ring-1 has-[:checked]:ring-secondary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary motion-reduce:transition-none"
            key={format}
          >
            <input
              checked={value === format}
              className="sr-only"
              disabled={isDisabled}
              name={name}
              onChange={() => onChange(format)}
              type="radio"
              value={format}
            />
            {NAMES[format]({}, { locale })}
          </label>
        ))}
      </div>
      <p className="mt-1.5 text-body-sm text-neutral" id={hintId}>
        {HINTS[value]({}, { locale })}
      </p>
    </fieldset>
  );
};
