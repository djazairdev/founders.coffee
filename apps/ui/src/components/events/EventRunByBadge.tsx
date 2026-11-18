import type { Locale } from '@founders-coffee/i18n';
import { Badge } from '@founders-coffee/ui';

import {
  eventRunByLabel,
  type EventRunBy,
} from '../../features/events/event-run-by';

export const EventRunByBadge = ({
  runBy,
  locale,
}: {
  runBy: EventRunBy;
  locale: Locale;
}) => (
  <Badge
    variant={runBy.kind === 'platform' ? 'primary' : 'outline'}
    size="sm"
    className="whitespace-nowrap font-medium"
  >
    {eventRunByLabel(runBy, locale)}
  </Badge>
);
