import { textLanguage } from '@founders-coffee/core';
import {
  hackathon_desc_label,
  host_desc_label,
  type Locale,
} from '@founders-coffee/i18n';
import type { EventDetailItem } from '@founders-coffee/server-fns';

import { MarkdownDescription } from '../markdown/MarkdownDescription';

type EventDescriptionProps = {
  locale: Locale;
  kind: EventDetailItem['kind'];
  value: string;
  languages: readonly string[];
};

export const EventDescription = ({
  locale,
  kind,
  value,
  languages,
}: EventDescriptionProps) => {
  const label =
    kind === 'hackathon'
      ? hackathon_desc_label({}, { locale })
      : host_desc_label({}, { locale });
  const description = (
    <MarkdownDescription
      locale={locale}
      language={textLanguage(value, languages) ?? null}
      label={label}
      isRegion={kind !== 'hackathon'}
      value={value}
      className={
        kind === 'hackathon'
          ? 'mt-3 max-w-3xl text-body-md'
          : 'mt-4 max-w-3xl text-body-lg'
      }
    />
  );

  return kind === 'hackathon' ? (
    <section aria-labelledby="hackathon-description-heading" className="mt-8">
      <h2
        id="hackathon-description-heading"
        className="font-display text-h4 font-semibold"
      >
        {label}
      </h2>
      {description}
    </section>
  ) : (
    description
  );
};
