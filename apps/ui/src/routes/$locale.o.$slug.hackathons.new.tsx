import { createFileRoute, notFound } from '@tanstack/react-router';
import { z } from 'zod';

import { appErrorCode } from '@founders-coffee/core';
import type { Market } from '@founders-coffee/db';
import type { geo } from '@founders-coffee/domain';
import { hackathon_create } from '@founders-coffee/i18n';

import { requireSession } from '../features/auth/require-session';
import { eventsApi } from '../features/events/api';
import { HackathonCreatePage } from '../features/hackathons/components/HackathonCreatePage';
import { organisationsApi } from '../features/organisations/api';
import type { OrganisationRoster } from '../features/organisations/types';
import { NO_INDEX_VALUE } from '../lib/indexation';
import { privatePageHead } from '../lib/seo-private';

type HackathonCreateLoaderData = {
  organisation: OrganisationRoster;
  market: Market;
  city: geo.GeoCity | null;
  mapboxToken: string;
};

const HackathonCreateRoute = () => {
  const { locale } = Route.useRouteContext();
  const { organisation, market, city, mapboxToken } = Route.useLoaderData();
  return (
    <HackathonCreatePage
      locale={locale}
      organisation={organisation}
      market={market}
      city={city}
      mapboxToken={mapboxToken}
    />
  );
};

export const Route = createFileRoute('/$locale/o/$slug/hackathons/new')({
  staticData: { hasOwnMobileHeader: true, isFocusedTask: true },
  beforeLoad: async ({ location, context }) => {
    await requireSession(context.locale, location.href);
  },
  headers: () => ({
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': NO_INDEX_VALUE,
  }),
  validateSearch: z.object({
    city: z.coerce.string().max(16).optional(),
  }),
  loaderDeps: ({ search }) => ({ city: search.city }),
  component: HackathonCreateRoute,
  loader: async ({
    params,
    deps,
    context,
  }): Promise<HackathonCreateLoaderData> => {
    let organisation: OrganisationRoster;
    try {
      organisation = await organisationsApi.mine(params.slug);
    } catch (error) {
      const code = appErrorCode(error);
      if (code === 'organisation_not_found' || code === 'validation_failed')
        throw notFound();
      throw error;
    }
    const listed = context.markets.find(
      (candidate) => candidate.code === organisation.marketCode,
    );
    if (!listed) throw notFound();
    const market = await eventsApi.getMarket({ data: { slug: listed.slug } });
    const cityCode = deps.city ?? organisation.cityCode ?? undefined;
    const [city, mapboxToken] = await Promise.all([
      cityCode
        ? eventsApi.getCity({ data: { country: market.code, cityCode } })
        : null,
      eventsApi.getMapboxToken(),
    ]);
    return { organisation, market, city: city ?? null, mapboxToken };
  },
  head: ({ match }) =>
    privatePageHead(hackathon_create({}, { locale: match.context.locale })),
});
