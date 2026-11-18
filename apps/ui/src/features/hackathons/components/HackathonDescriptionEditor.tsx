import {
  hackathon_desc_label,
  host_required,
  type Locale,
} from '@founders-coffee/i18n';

export const HackathonDescriptionEditor = ({
  locale,
  description,
  error,
  placeholder,
  onChange,
}: {
  locale: Locale;
  description: string;
  error?: string;
  placeholder: string;
  onChange: (value: string) => void;
}) => {
  const descriptionErrorId = 'hackathon-description-error';

  return (
    <div className="flex min-h-48 flex-1 flex-col lg:min-h-0">
      <span className="mb-1 flex items-center justify-between gap-3 text-body-sm text-neutral">
        <label htmlFor="hackathon-description">
          {hackathon_desc_label({}, { locale })}
        </label>
        <span aria-hidden="true" className="text-caption text-neutral">
          {host_required({}, { locale })}
        </span>
      </span>
      <textarea
        id="hackathon-description"
        className={`textarea textarea-sm md:textarea-md w-full flex-1 resize-none font-mono leading-relaxed ${
          error ? 'textarea-error' : ''
        }`}
        dir="auto"
        lang={locale}
        aria-required="true"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? descriptionErrorId : undefined}
        placeholder={placeholder}
        value={description}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      {error ? (
        <span id={descriptionErrorId} className="mt-1 text-body-sm text-error">
          {error}
        </span>
      ) : null}
    </div>
  );
};
