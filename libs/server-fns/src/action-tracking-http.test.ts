import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { handleActionTrackingRequest } from './action-tracking-http.js';
import { consumeRateBudget } from './rate-consume.js';
import { RATE_BUDGETS } from './rate-budgets.js';
const url = new URL('https://founders.coffee/api/actions');
const config = {
  ANALYTICS: env.ANALYTICS,
  APP_ENVIRONMENT: 'development',
  ACTION_ANALYTICS_ENABLED: 'true',
};
const action = {
  event: 'landing_view',
  page: 'market',
  locale: 'ar',
  market: 'DZ',
  attribution: {
    source: 'facebook',
    medium: 'paid_social',
    campaign: 'activation-check',
  },
};
const request = (
  body: unknown = action,
  headers: Record<string, string> = {},
) =>
  new Request(url, {
    method: 'POST',
    headers: {
      Origin: url.origin,
      'Content-Type': 'application/json',
      'cf-connecting-ip': '192.0.2.1',
      ...headers,
    },
    body: JSON.stringify(body),
  });
describe('action HTTP handler with real Analytics Engine and Durable Object bindings', () => {
  it('accepts the bounded report and refuses invalid origins, identifiers and oversized bodies', async () => {
    expect(
      (await handleActionTrackingRequest(request(), url, config)).status,
    ).toBe(204);
    expect(
      (
        await handleActionTrackingRequest(
          request(action, { Origin: 'https://attacker.test' }),
          url,
          config,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await handleActionTrackingRequest(
          request({ ...action, userId: 'private' }),
          url,
          config,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await handleActionTrackingRequest(
          request('x'.repeat(1025)),
          url,
          config,
        )
      ).status,
    ).toBe(413);
    expect(
      (
        await handleActionTrackingRequest(
          request(action, { 'Content-Type': 'text/plain' }),
          url,
          config,
        )
      ).status,
    ).toBe(415);
    expect(
      (await handleActionTrackingRequest(new Request(url), url, config)).status,
    ).toBe(405);
  });
  it('drops privacy opted-out and disabled reports without requiring an analytics binding', async () => {
    expect(
      (
        await handleActionTrackingRequest(
          request(action, { 'Sec-GPC': '1' }),
          url,
          {},
        )
      ).status,
    ).toBe(204);
    expect(
      (
        await handleActionTrackingRequest(
          request(action, { DNT: '1' }),
          url,
          {},
        )
      ).status,
    ).toBe(204);
    expect(
      (
        await handleActionTrackingRequest(request(), url, {
          ...config,
          ACTION_ANALYTICS_ENABLED: 'false',
        })
      ).status,
    ).toBe(503);
  });
  it('silently drops an exhausted anonymous telemetry bucket', async () => {
    const budget = RATE_BUDGETS.telemetry.actions;
    for (let count = 0; count < budget.limit; count += 1)
      await consumeRateBudget(
        'ip:192.0.2.2',
        budget.action,
        budget.limit,
        budget.windowMs,
      );
    expect(
      (
        await handleActionTrackingRequest(
          request(
            { ...action, userId: 'must_not_parse' },
            { 'cf-connecting-ip': '192.0.2.2' },
          ),
          url,
          config,
        )
      ).status,
    ).toBe(204);
    expect(
      await consumeRateBudget(
        'ip:192.0.2.2',
        budget.action,
        budget.limit,
        budget.windowMs,
      ),
    ).toBe(false);
  });
});
