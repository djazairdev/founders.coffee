import {
  hackathon_title_label,
  host_character_count,
  host_required,
  type Locale,
} from '@founders-coffee/i18n';
import { Input } from '@founders-coffee/ui';

export const HackathonTitleField = ({
  locale,
  title,
  error,
  minLength,
  maxLength,
  onChange,
}: {
  locale: Locale;
  title: string;
  error?: string;
  minLength: number;
  maxLength: number;
  onChange: (value: string) => void;
}) => (
  <div className="flex flex-col">
    <span className="mb-1 flex items-center justify-between gap-3 text-body-sm text-neutral">
      <label htmlFor="host-title">
        {hackathon_title_label({}, { locale })}
      </label>
      <span aria-hidden="true" className="text-caption text-neutral">
        {host_required({}, { locale })}
      </span>
    </span>
    <Input
      id="host-title"
      value={title}
      onChange={(event) => onChange(event.target.value)}
      minLength={minLength}
      maxLength={maxLength}
      required
      aria-invalid={!!error}
      aria-describedby={`host-title-count${error ? ' host-title-error' : ''}`}
    />
    <span
      id="host-title-count"
      className="mt-1 text-end text-caption text-neutral"
    >
      {host_character_count(
        { current: title.length, max: maxLength },
        { locale },
      )}
    </span>
    {error ? (
      <span id="host-title-error" className="mt-1 text-body-sm text-error">
        {error}
      </span>
    ) : null}
  </div>
);
