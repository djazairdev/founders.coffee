import type { EventKind } from '@founders-coffee/core';
import type { Market } from '@founders-coffee/db';
import type { geo } from '@founders-coffee/domain';
import { type Locale } from '@founders-coffee/i18n';
import type {
  EventFeedItem,
  EventFeedPage,
  TrendingSection,
} from '@founders-coffee/server-fns';

import { HackathonOrganisers } from '../../features/hackathons/components/HackathonOrganisers';

import { DiscoverFeed } from './DiscoverFeed';
import { HowItWorks } from './HowItWorks';
import { InnovationInsight } from './InnovationInsight';
import { MarketHero } from './MarketHero';
import { TrendingStates } from './TrendingStates';

type MarketLandingProps = {
  locale: Locale;
  market: Market;
  cities: readonly geo.GeoCity[];
  cityEventCounts: Record<string, number>;
  events: readonly EventFeedItem[];
  afterStartsAt?: number;
  afterId?: string;
  nextCursor?: EventFeedPage['nextCursor'];
  type?: EventKind;
  trending: TrendingSection;
};

export const MarketLanding = ({
  locale,
  market,
  cityEventCounts,
  events,
  afterStartsAt,
  afterId,
  nextCursor,
  type,
  trending,
}: MarketLandingProps) => (
  <>
    <MarketHero
      locale={locale}
      market={market}
      cityEventCounts={cityEventCounts}
    />
    <TrendingStates locale={locale} market={market} trending={trending} />
    <DiscoverFeed
      locale={locale}
      market={market}
      events={events}
      afterStartsAt={afterStartsAt}
      afterId={afterId}
      nextCursor={nextCursor}
      type={type}
    />
    <HowItWorks locale={locale} marketSlug={market.slug} />
    {market.featureFlags.hackathons ? (
      <InnovationInsight locale={locale} />
    ) : null}
    <HackathonOrganisers
      locale={locale}
      isEnabled={market.featureFlags.hackathons}
    />
  </>
);
