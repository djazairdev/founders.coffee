import {
  event_run_by_co_hosted,
  event_run_by_community,
  event_run_by_platform,
  type Locale,
} from '@founders-coffee/i18n';
import type { EventFeedItem } from '@founders-coffee/server-fns';

export type EventRunBy = EventFeedItem['runBy'];

const LABELS = {
  platform: event_run_by_platform,
  co_hosted: event_run_by_co_hosted,
  community: event_run_by_community,
} as const satisfies Record<EventRunBy['kind'], unknown>;

/** Who runs an event, in the reader's language, one wording for the card and the page. */
export const eventRunByLabel = (runBy: EventRunBy, locale: Locale): string =>
  LABELS[runBy.kind]({}, { locale });

export type EventCoHost = Extract<
  EventRunBy,
  { readonly kind: 'co_hosted' }
>['organisations'][number];

/** The organisations a co-hosted event names, the lead first; none for any other event. */
export const coHosts = (runBy: EventRunBy): readonly EventCoHost[] =>
  runBy.kind === 'co_hosted' ? runBy.organisations : [];
