import { useEffect, useRef } from 'react';
import { useRouter } from '@tanstack/react-router';
import { actionSchema, campaignSearchSchema } from '@founders-coffee/core';
import { cityCodeInView } from '../../lib/route-chrome';
import { setActionScope, trackAction } from './client';

const PAGE_EVENTS = {
  '/$locale/$market/': ['market', 'landing_view'],
  '/$locale/$market/$city': ['city', 'city_view'],
  '/$locale/$market/e/$slug': ['event', 'event_view'],
  '/$locale/$market/host/create': ['host', 'host_start'],
} as const;

/** Count resolved navigation only; preloads, failed loaders and invalidations are not visits. */
export const useActionTracking = (): void => {
  const router = useRouter();
  const last = useRef<string | undefined>(undefined);
  useEffect(() => {
    const report = () => {
      const { matches, location } = router.state;
      const leaf = matches.at(-1);
      if (!leaf || leaf.status !== 'success') {
        setActionScope(undefined);
        last.current = undefined;
        return;
      }
      const entry = PAGE_EVENTS[leaf.routeId as keyof typeof PAGE_EVENTS];
      if (!entry) {
        setActionScope(undefined);
        last.current = undefined;
        return;
      }
      const context = leaf.context as {
        locale?: string;
        activeMarket?: { code: string };
      };
      const parsed = actionSchema.safeParse({
        event: entry[1],
        page: entry[0],
        locale: context.locale,
        market: context.activeMarket?.code,
        city: cityCodeInView(matches),
        attribution: { source: 'none', medium: 'none', campaign: 'none' },
      });
      if (!parsed.success) {
        setActionScope(undefined);
        last.current = undefined;
        return;
      }
      const { event, page, locale, market, city } = parsed.data;
      const scope = { page, locale, market, city };
      setActionScope(scope);
      const key = `${leaf.routeId}:${location.pathname}:${JSON.stringify(campaignSearchSchema.parse(location.search))}`;
      if (last.current === key) return;
      last.current = key;
      trackAction(event);
    };
    report();
    return router.subscribe('onResolved', report);
  }, [router]);
};
