import { useId } from 'react';

import {
  host_as_label,
  host_as_myself,
  host_as_myself_hint,
  host_as_organisation_hint,
  type Locale,
} from '@founders-coffee/i18n';

import type { HostOrganisation } from '../../features/events/host-organisations';

const HostAsOption = ({
  name,
  title,
  hint,
  isChosen,
  onChoose,
}: {
  name: string;
  title: string;
  hint: string;
  isChosen: boolean;
  onChoose: () => void;
}) => (
  <label
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
      checked={isChosen}
      onChange={onChoose}
    />
    <span className="min-w-0 flex-1">
      <bdi className="block break-words text-body-sm font-semibold text-base-content">
        {title}
      </bdi>
      <span className="block text-caption text-neutral">{hint}</span>
    </span>
  </label>
);

export const EventHostAsField = ({
  locale,
  organisations,
  value,
  onChange,
}: {
  locale: Locale;
  organisations: readonly HostOrganisation[];
  value: string | null;
  onChange: (next: string | null) => void;
}) => {
  const name = useId();

  return (
    <fieldset className="flex flex-col">
      <legend className="mb-1 text-body-sm text-neutral">
        {host_as_label({}, { locale })}
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        <HostAsOption
          name={name}
          title={host_as_myself({}, { locale })}
          hint={host_as_myself_hint({}, { locale })}
          isChosen={value === null}
          onChoose={() => onChange(null)}
        />
        {organisations.map((organisation) => (
          <HostAsOption
            key={organisation.id}
            name={name}
            title={organisation.name}
            hint={host_as_organisation_hint({}, { locale })}
            isChosen={value === organisation.id}
            onChoose={() => onChange(organisation.id)}
          />
        ))}
      </div>
    </fieldset>
  );
};
