import { useId } from 'react';

import {
  host_kind_label,
  host_kind_meetup_hint,
  host_kind_workshop_hint,
  type Locale,
} from '@founders-coffee/i18n';

import { eventKindName } from '../../features/events/event-kind-name';
import {
  HOST_EVENT_KINDS,
  type HostEventKind,
} from '../../features/events/types';

const HINTS = {
  meetup: host_kind_meetup_hint,
  workshop: host_kind_workshop_hint,
} as const;

export const EventKindField = ({
  locale,
  value,
  onChange,
}: {
  locale: Locale;
  value: HostEventKind;
  onChange: (next: HostEventKind) => void;
}) => {
  const name = useId();

  return (
    <fieldset className="flex flex-col">
      <legend className="mb-1 text-body-sm text-neutral">
        {host_kind_label({}, { locale })}
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {HOST_EVENT_KINDS.map((kind) => {
          const isChosen = value === kind;
          return (
            <label
              key={kind}
              className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-box border px-3 py-2.5 transition-colors duration-[var(--duration-fast)] motion-reduce:transition-none ${
                isChosen
                  ? 'border-primary bg-base-100'
                  : 'border-base-300 hover:bg-base-200'
              }`}
            >
              <input
                type="radio"
                className="radio radio-primary mt-0.5 shrink-0"
                name={name}
                value={kind}
                checked={isChosen}
                onChange={() => onChange(kind)}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-body-sm font-semibold text-base-content">
                  {eventKindName(kind, locale)}
                </span>
                <span className="block text-caption text-neutral">
                  {HINTS[kind]({}, { locale })}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
};
