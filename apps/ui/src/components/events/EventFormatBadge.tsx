import { MapPin, Video } from 'lucide-react';

import type { EventFormat } from '@founders-coffee/core';
import { event_format_in_person, type Locale } from '@founders-coffee/i18n';
import { Badge } from '@founders-coffee/ui';

import { eventFormatName } from '../../features/events/event-format-name';

export const EventFormatBadge = ({
  format,
  locale,
  showInPerson = false,
}: {
  format: EventFormat;
  locale: Locale;
  showInPerson?: boolean;
}) => {
  const name =
    format === 'in_person' && showInPerson
      ? event_format_in_person({}, { locale })
      : eventFormatName(format, locale);
  const Icon = format === 'in_person' ? MapPin : Video;
  return name ? (
    <Badge variant="outline" size="sm" className="gap-1 font-medium">
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {name}
    </Badge>
  ) : null;
};
