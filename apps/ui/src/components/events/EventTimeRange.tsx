import {
  formatDate,
  host_time_from,
  host_time_to,
  type Locale,
} from '@founders-coffee/i18n';

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
  const at = (value: Date) =>
    formatDate(value, locale, {
      timeZone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });
  if (end === null) return <bdi dir="ltr">{at(start)}</bdi>;
  return locale === 'ar' ? (
    <span dir="rtl">
      {host_time_from({}, { locale })} <bdi dir="ltr">{at(start)}</bdi>{' '}
      {host_time_to({}, { locale })} <bdi dir="ltr">{at(end)}</bdi>
    </span>
  ) : (
    <bdi dir="ltr">{`${at(start)}–${at(end)}`}</bdi>
  );
};
