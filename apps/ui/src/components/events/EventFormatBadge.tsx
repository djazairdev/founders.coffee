import { Video } from 'lucide-react';

import type { EventFormat } from '@founders-coffee/core';
import type { Locale } from '@founders-coffee/i18n';
import { Badge } from '@founders-coffee/ui';

import { eventFormatName } from '../../features/events/event-format-name';

export const EventFormatBadge = ({
  format,
  locale,
}: {
  format: EventFormat;
  locale: Locale;
}) => {
  const name = eventFormatName(format, locale);
  return name ? (
    <Badge variant="outline" size="sm" className="gap-1 font-medium">
      <Video className="size-3.5 shrink-0" aria-hidden="true" />
      {name}
    </Badge>
  ) : null;
};
