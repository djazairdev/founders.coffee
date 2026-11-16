import type { Locale } from '@founders-coffee/i18n';

import { useRepeatEventTemplate } from '../../features/events/hooks';
import { useMyOrganisations } from '../../features/organisations/hooks';
import { RepeatHostLink } from './RepeatHostLink';

export const OrganiserRepeatLink = ({
  eventId,
  cityCode,
  marketSlug,
  locale,
}: {
  eventId: string;
  cityCode: string;
  marketSlug: string;
  locale: Locale;
}) => {
  const organisations = useMyOrganisations(true);
  const repeat = useRepeatEventTemplate(
    eventId,
    (organisations.data?.length ?? 0) > 0,
  );
  if (!repeat.data) return null;
  return (
    <RepeatHostLink
      locale={locale}
      marketSlug={marketSlug}
      cityCode={cityCode}
      eventId={eventId}
    />
  );
};
