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
  isHintVisible = true,
  label,
  names,
  formats = EVENT_FORMATS,
  presentation = 'chips',
  onChange,
}: {
  locale: Locale;
  value: EventFormat;
  isDisabled?: boolean;
  isHintVisible?: boolean;
  label?: string;
  names?: Partial<Record<EventFormat, string>>;
  formats?: readonly EventFormat[];
  presentation?: 'chips' | 'radio-list';
  onChange: (next: EventFormat) => void;
}) => {
  const name = useId();
  const hintId = `${name}-hint`;
  return (
    <fieldset
      aria-describedby={isHintVisible ? hintId : undefined}
      className="flex flex-col"
    >
      <legend className="mb-1.5 text-body-sm text-neutral">
        {label ?? host_format_label({}, { locale })}
      </legend>
      {presentation === 'radio-list' ? (
        <div className="grid gap-2">
          {formats.map((format) => (
            <label
              className="flex min-h-11 cursor-pointer items-center gap-3 text-start"
              key={format}
            >
              <input
                checked={value === format}
                className="radio radio-sm radio-primary shrink-0"
                disabled={isDisabled}
                name={name}
                onChange={() => onChange(format)}
                type="radio"
                value={format}
              />
              <span className="text-body-sm text-base-content">
                {names?.[format] ?? NAMES[format]({}, { locale })}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {formats.map((format) => (
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
              {names?.[format] ?? NAMES[format]({}, { locale })}
            </label>
          ))}
        </div>
      )}
      {isHintVisible ? (
        <p className="mt-1.5 text-body-sm text-neutral" id={hintId}>
          {HINTS[value]({}, { locale })}
        </p>
      ) : null}
    </fieldset>
  );
};
