import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { appErrorCode, type EventKind } from '@founders-coffee/core';
import { localizedName, type Locale } from '@founders-coffee/i18n';
import { getCityLanding, type MarketCity } from '@founders-coffee/server-fns';

import { CityLanding } from '../components/landing/CityLanding';
import { localizedCity } from '../lib/locale-routing';
import {
  landingCanonicalQuery,
  landingSearchSchema,
} from '../lib/event-type-filter';
import {
  cursorPairOnly,
  type PublicPaginationSearch,
} from '../lib/public-pagination';
import { canonicalUrl, cityPageHead } from '../lib/seo';

const CityRoute = () => {
  const {
    locale,
    market,
    city,
    events,
    eventsNextCursor,
    afterStartsAt,
    afterId,
    type,
  } = Route.useLoaderData();
  return (
    <CityLanding
      locale={locale}
      market={market}
      city={city}
      events={events}
      afterStartsAt={afterStartsAt}
      afterId={afterId}
      nextCursor={eventsNextCursor}
      type={type}
    />
  );
};

export const Route = createFileRoute('/$locale/$market/$city')({
  validateSearch: landingSearchSchema,
  loaderDeps: ({ search }) => ({
    afterStartsAt: search.afterStartsAt,
    afterId: search.afterId,
    type: search.type,
  }),
  component: CityRoute,
  loader: async ({
    params,
    deps,
    context,
  }): Promise<
    MarketCity & {
      locale: Locale;
      pagination: PublicPaginationSearch;
      afterStartsAt?: number;
      afterId?: string;
      type: EventKind | undefined;
    }
  > => {
    const { type, ...cursor } = deps;
    const pagination = cursorPairOnly(cursor);
    try {
      const data = await getCityLanding({
        data: {
          marketKey: params.market,
          citySlug: params.city,
          ...pagination,
          kind: type,
        },
      });
      if (params.market !== data.market.slug) {
        throw redirect({
          ...localizedCity(context.locale, data.market.slug, data.city.slug),
          search: { ...pagination, type },
        });
      }
      if (!data.cursorValid) {
        throw redirect({
          ...localizedCity(context.locale, data.market.slug, data.city.slug),
          search: { type },
        });
      }
      return {
        ...data,
        ...pagination,
        type,
        locale: context.locale,
        pagination,
      };
    } catch (error) {
      const code = appErrorCode(error);
      if (code === 'market_not_found' || code === 'city_not_found')
        throw notFound();
      throw error;
    }
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [], links: [], scripts: [] };
    const cityName = localizedName(loaderData.city, loaderData.locale);
    return cityPageHead({
      locale: loaderData.locale,
      marketName: localizedName(loaderData.market, loaderData.locale),
      marketCode: loaderData.market.code,
      cityName,
      isEmpty: loaderData.events.length === 0,
      events: loaderData.events.map((event) => ({
        name: event.title,
        url: canonicalUrl({
          type: 'event',
          market: loaderData.market.slug,
          slug: event.slug,
          locale: loaderData.locale,
        }),
      })),
      route: {
        type: 'city',
        market: loaderData.market.slug,
        city: loaderData.city.slug,
        locale: loaderData.locale,
        query: landingCanonicalQuery(loaderData.pagination, loaderData.type),
      },
    });
  },
});
