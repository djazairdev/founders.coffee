import {
  host_meeting_url_hint,
  host_meeting_url_label,
  profile_link_placeholder,
  type Locale,
} from '@founders-coffee/i18n';
import { Input } from '@founders-coffee/ui';

export const MEETING_URL_FIELD_ID = 'host-meeting-url';

export const HostMeetingLinkField = ({
  id = MEETING_URL_FIELD_ID,
  locale,
  value,
  error,
  isDisabled = false,
  onChange,
}: {
  id?: string;
  locale: Locale;
  value: string;
  error?: string;
  isDisabled?: boolean;
  onChange: (value: string) => void;
}) => {
  const noteId = `${id}-note`;
  return (
    <div className="flex flex-col">
      <label className="mb-1.5 text-body-sm text-neutral" htmlFor={id}>
        {host_meeting_url_label({}, { locale })}
      </label>
      <Input
        aria-describedby={noteId}
        aria-invalid={error ? true : undefined}
        autoCapitalize="off"
        autoComplete="url"
        disabled={isDisabled}
        id={id}
        inputMode="url"
        maxLength={2048}
        onChange={(event) => onChange(event.target.value)}
        placeholder={profile_link_placeholder({}, { locale })}
        spellCheck={false}
        type="url"
        value={value}
      />
      <p
        className={`mt-1.5 text-body-sm ${error ? 'text-error' : 'text-neutral'}`}
        id={noteId}
      >
        {error ?? host_meeting_url_hint({}, { locale })}
      </p>
    </div>
  );
};
