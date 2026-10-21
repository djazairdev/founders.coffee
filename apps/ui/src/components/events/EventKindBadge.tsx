import type { Locale } from '@founders-coffee/i18n';
import { Badge } from '@founders-coffee/ui';

import {
  eventKindName,
  type EventKind,
} from '../../features/events/event-kind-name';

export const EventKindBadge = ({
  kind,
  locale,
}: {
  kind: EventKind;
  locale: Locale;
}) => (
  <Badge variant="outline" size="sm" className="font-medium">
    {eventKindName(kind, locale)}
  </Badge>
);
