import type { Locale } from '@founders-coffee/i18n';
import { StatusMessage } from '@founders-coffee/ui';

import { EventCard } from '../../../components/events/EventCard';
import type { RootMarket } from '../../markets/api';
import type { OrganisationPage } from '../api';

export const OrganisationEventList = ({
  id,
  title,
  emptyText,
  events,
  locale,
  markets,
}: {
  id: string;
  title: string;
  emptyText: string;
  events: OrganisationPage['upcoming'];
  locale: Locale;
  markets: readonly RootMarket[];
}) => {
  const marketByCode = new Map(markets.map((market) => [market.code, market]));
  const shown = events.flatMap((event) => {
    const market = marketByCode.get(event.marketCode);
    return market ? [{ event, market }] : [];
  });

  return (
    <section aria-labelledby={id} className="mt-10">
      <h2 id={id} className="mb-5 font-display text-h3 font-semibold">
        {title}
      </h2>
      {shown.length === 0 ? (
        <StatusMessage variant="info">{emptyText}</StatusMessage>
      ) : (
        <ul className="grid items-start gap-3">
          {shown.map(({ event, market }) => (
            <li key={event.id}>
              <EventCard
                event={event}
                locale={locale}
                timezone={market.timezone}
                marketSlug={market.slug}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
