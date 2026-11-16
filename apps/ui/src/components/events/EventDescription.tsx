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
}: EventDescriptionProps) => (
  <MarkdownDescription
    locale={locale}
    language={textLanguage(value, languages) ?? null}
    label={
      kind === 'hackathon'
        ? hackathon_desc_label({}, { locale })
        : host_desc_label({}, { locale })
    }
    value={value}
    className="mt-4 max-w-3xl text-body-lg"
  />
);
