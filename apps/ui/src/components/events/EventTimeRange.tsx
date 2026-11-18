import {
  host_time_from,
  host_time_to,
  type Locale,
} from '@founders-coffee/i18n';

import { endsOnAnotherDay, eventClockLabel, eventDayLabel } from './event-time';

export const EventTimeRange = ({
  locale,
  timeZone,
  start,
  end,
}: {
  locale: Locale;
  timeZone: string;
  start: Date;
  end: Date | null;
}) => {
  const at = (value: Date) => eventClockLabel(value, locale, timeZone);
  if (end === null) return <bdi dir="ltr">{at(start)}</bdi>;
  const endDay = endsOnAnotherDay(start, end, timeZone)
    ? eventDayLabel(end, locale, timeZone)
    : null;
  if (locale === 'ar')
    return (
      <span dir="rtl">
        {host_time_from({}, { locale })} <bdi dir="ltr">{at(start)}</bdi>{' '}
        {host_time_to({}, { locale })} {endDay ? <bdi>{endDay}</bdi> : null}
        {endDay ? ' ' : null}
        <bdi dir="ltr">{at(end)}</bdi>
      </span>
    );
  return (
    <bdi dir="ltr">
      {endDay
        ? `${at(start)} – ${endDay}, ${at(end)}`
        : `${at(start)}–${at(end)}`}
    </bdi>
  );
};
