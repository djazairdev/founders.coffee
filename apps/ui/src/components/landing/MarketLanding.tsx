import type { EventKind } from '@founders-coffee/core';
import type { Market } from '@founders-coffee/db';
import type { geo } from '@founders-coffee/domain';
import { type Locale } from '@founders-coffee/i18n';
import type {
  EventFeedItem,
  EventFeedPage,
  MarketHackathon,
  TrendingSection,
} from '@founders-coffee/server-fns';

import {
  FIRST_HACKATHON,
  isAnnouncementShown,
} from '../../content/hackathon/announcement';
import { MarketHackathons } from '../../features/hackathons/components/MarketHackathons';

import { DiscoverFeed } from './DiscoverFeed';
import { HackathonAnnouncement } from './HackathonAnnouncement';
import { HowItWorks } from './HowItWorks';
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
  hackathons: readonly MarketHackathon[];
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
  hackathons,
}: MarketLandingProps) => {
  const isAnnounced = isAnnouncementShown(
    FIRST_HACKATHON,
    market.code,
    market.timezone,
    Date.now(),
  );
  return (
    <>
      <MarketHero
        locale={locale}
        market={market}
        cityEventCounts={cityEventCounts}
      />
      <HackathonAnnouncement
        locale={locale}
        market={market}
        className="mx-auto max-w-content px-4 pt-10 md:px-8 md:pt-14"
      />
      <MarketHackathons
        locale={locale}
        market={market}
        hackathons={hackathons}
        isAnnounced={isAnnounced}
        className="mx-auto max-w-content px-4 pt-10 md:px-8 md:pt-14"
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
    </>
  );
};
