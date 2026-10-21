import { createFileRoute, notFound } from '@tanstack/react-router';

import { appErrorCode } from '@founders-coffee/core';
import { profile_title } from '@founders-coffee/i18n';

import { eventsApi, type HostedEventItem } from '../features/events/api';
import { profileApi, type PublicProfile } from '../features/profile/api';
import { PublicProfilePage } from '../features/profile/components/PublicProfilePage';
import {
  hostedPaginationSearchSchema,
  type HostedPaginationSearch,
} from '../lib/public-pagination';
import { profilePageHead, profileRobots } from '../lib/seo-profile';

const PublicProfileRoute = () => {
  const { locale, markets } = Route.useRouteContext();
  const { profile, events, eventsNextCursor, eventsTotal, pagination } =
    Route.useLoaderData();
  return (
    <PublicProfilePage
      locale={locale}
      profile={profile}
      events={events}
      eventsNextCursor={eventsNextCursor}
      eventsTotal={eventsTotal}
      beforeStartsAt={pagination.beforeStartsAt}
      beforeId={pagination.beforeId}
      markets={markets}
    />
  );
};

export const Route = createFileRoute('/$locale/u/$userId')({
  validateSearch: hostedPaginationSearchSchema,
  loaderDeps: ({ search }) => ({
    beforeStartsAt: search.beforeStartsAt,
    beforeId: search.beforeId,
  }),
  component: PublicProfileRoute,
  loader: async ({
    params,
    deps,
  }): Promise<{
    profile: PublicProfile;
    events: readonly HostedEventItem[];
    eventsNextCursor: { startsAt: number; id: string } | null;
    eventsTotal: number;
    pagination: HostedPaginationSearch;
  }> => {
    let profile: PublicProfile;
    try {
      profile = await profileApi.getPublicProfile(params.userId);
    } catch (error) {
      if (appErrorCode(error) === 'not_found') throw notFound();
      throw error;
    }
    const page = await eventsApi.getHostedEvents({
      data: { hostId: params.userId, limit: 12, ...deps },
    });
    return {
      profile,
      events: page.items,
      eventsNextCursor: page.nextCursor,
      eventsTotal: page.total,
      pagination: deps,
    };
  },
  headers: ({ loaderData }) => ({
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': profileRobots(loaderData?.profile),
  }),
  staleTime: 0,
  gcTime: 0,
  head: ({ loaderData, match }) =>
    profilePageHead(
      match.context.locale,
      profile_title({}, { locale: match.context.locale }),
      loaderData?.profile,
    ),
});
