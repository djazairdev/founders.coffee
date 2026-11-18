import {
  host_languages_hint,
  host_languages_label,
  type Locale,
} from '@founders-coffee/i18n';
import { ChipGroup, toggleChip } from '@founders-coffee/ui';

import {
  localeLabel,
  SPOKEN_LOCALE_OPTIONS,
} from '../../features/profile/profile-labels';
import type { MeetupLanguage } from '../../features/events/types';

export const EventLanguagesField = ({
  id,
  locale,
  value,
  error,
  label,
  hint,
  onChange,
}: {
  id: string;
  locale: Locale;
  value: readonly MeetupLanguage[];
  error?: string;
  label?: string;
  hint?: string;
  onChange: (next: MeetupLanguage[]) => void;
}) => (
  <div className="flex flex-col">
    <span className="mb-1 block text-body-sm text-neutral">
      {label ?? host_languages_label({}, { locale })}
    </span>
    <ChipGroup
      id={id}
      options={SPOKEN_LOCALE_OPTIONS}
      selected={value}
      max={SPOKEN_LOCALE_OPTIONS.length}
      groupLabel={label ?? host_languages_label({}, { locale })}
      describedBy={`${id}-hint ${id}-error`}
      labelFor={(language) => localeLabel(language, locale)}
      onToggle={(language) =>
        onChange(toggleChip(value, language, SPOKEN_LOCALE_OPTIONS.length))
      }
    />
    <span id={`${id}-hint`} className="mt-2 text-caption text-neutral">
      {hint ?? host_languages_hint({}, { locale })}
    </span>
    {error && (
      <span id={`${id}-error`} className="mt-1 text-body-sm text-error">
        {error}
      </span>
    )}
  </div>
);
