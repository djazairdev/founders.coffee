import { z } from 'zod';

import { localeSchema } from './locale.js';
import { marketCodeSchema } from './validation.js';

export const CAMPAIGN_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
] as const;
export const campaignCodeSchema = z.string().regex(/^[a-z0-9_-]{1,64}$/);
export const campaignSchema = z.strictObject({
  source: campaignCodeSchema,
  medium: campaignCodeSchema,
  campaign: campaignCodeSchema,
});
export type Campaign = z.infer<typeof campaignSchema>;
export const ACTION_EVENTS = [
  'landing_view',
  'city_view',
  'event_view',
  'host_start',
  'rsvp_start',
  'share_open',
  'share_complete',
  'share_copy',
] as const;
export const ACTION_PAGES = ['market', 'city', 'event', 'host'] as const;
export const actionSchema = z.strictObject({
  event: z.enum(ACTION_EVENTS),
  page: z.enum(ACTION_PAGES),
  locale: localeSchema,
  market: marketCodeSchema,
  city: z
    .string()
    .regex(/^[a-z0-9_-]{1,64}$/)
    .optional(),
  attribution: campaignSchema,
});
export type Action = z.infer<typeof actionSchema>;
export const campaignFromSearch = (search: URLSearchParams): Campaign => ({
  source: campaignCodeSchema.safeParse(search.get('utm_source')).data ?? 'none',
  medium: campaignCodeSchema.safeParse(search.get('utm_medium')).data ?? 'none',
  campaign:
    campaignCodeSchema.safeParse(search.get('utm_campaign')).data ?? 'none',
});
export const campaignSearchSchema = z.object({
  utm_source: campaignCodeSchema.optional().catch(undefined),
  utm_medium: campaignCodeSchema.optional().catch(undefined),
  utm_campaign: campaignCodeSchema.optional().catch(undefined),
});
export type CampaignSearch = z.infer<typeof campaignSearchSchema>;
export const isPrivateRequest = (headers: Headers): boolean =>
  headers.get('DNT') === '1' || headers.get('Sec-GPC') === '1';
