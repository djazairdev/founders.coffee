import {
  campaignFromSearch,
  CAMPAIGN_KEYS,
  type Action,
  type Campaign,
} from '@founders-coffee/core';

let scope: Omit<Action, 'event' | 'attribution'> | undefined;
let reports = 0;
let previous: { key: string; at: number } | undefined;

/** Respect browser privacy signals without storing a visitor identifier. */
export const actionPrivacyRequested = (): boolean =>
  typeof navigator === 'undefined' ||
  navigator.doNotTrack === '1' ||
  ('globalPrivacyControl' in navigator &&
    navigator.globalPrivacyControl === true);

/** Only fixed campaign codes leave the page, never a URL, referrer or user identifier. */
export const browserCampaign = (): Campaign | undefined =>
  typeof window === 'undefined' || actionPrivacyRequested()
    ? undefined
    : campaignFromSearch(new URLSearchParams(window.location.search));

/** Establish the successful public route currently on screen. */
export const setActionScope = (next: typeof scope): void => {
  scope = next;
};

/** Send a bounded anonymous action without delaying navigation or exposing session cookies. */
export const trackAction = (event: Action['event']): void => {
  const attribution = browserCampaign();
  if (!scope || !attribution || reports >= 50) return;
  const action = { ...scope, event, attribution };
  const key = JSON.stringify(action);
  const at = Date.now();
  if (previous?.key === key && at - previous.at < 400) return;
  previous = { key, at };
  reports += 1;
  void fetch('/api/actions', {
    method: 'POST',
    credentials: 'omit',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: key,
  }).catch(() => undefined);
};

/** Carry validated campaign codes through a same-origin authentication return path. */
export const campaignReturnPath = (path: string): string => {
  if (typeof window === 'undefined') return path;
  const url = new URL(path, window.location.origin);
  if (
    url.origin !== window.location.origin ||
    !path.startsWith('/') ||
    path.startsWith('//')
  )
    return path;
  const campaign = browserCampaign();
  for (const [index, key] of CAMPAIGN_KEYS.entries()) {
    const value =
      campaign && [campaign.source, campaign.medium, campaign.campaign][index];
    if (value && value !== 'none') url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  return `${url.pathname}${url.search}${url.hash}`;
};

/** Shared links identify community sharing rather than inheriting the sender's paid campaign. */
export const communityShareUrl = (url: string): string => {
  if (actionPrivacyRequested()) return url;
  const next = new URL(url);
  next.searchParams.set('utm_source', 'community');
  next.searchParams.set('utm_medium', 'share');
  next.searchParams.set('utm_campaign', 'local-meetups');
  return next.href;
};
