import { actionSchema, isPrivateRequest } from '@founders-coffee/core';
import type { WorkerEnv } from '@founders-coffee/infra';
import { createMetrics } from '@founders-coffee/observability';

import { consumeRateBudget } from './rate-consume.js';
import { readBounded } from './read-bounded.js';
import { RATE_BUDGETS } from './rate-budgets.js';

export const ACTION_TRACKING_PATH = '/api/actions';
const answer = (status: number): Response =>
  new Response(null, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });

/** Validate a bounded, anonymous, same-origin report; never log its body or the limiting address. */
export const handleActionTrackingRequest = async (
  request: Request,
  url: URL,
  env: Pick<
    WorkerEnv,
    'ANALYTICS' | 'APP_ENVIRONMENT' | 'ACTION_ANALYTICS_ENABLED'
  >,
): Promise<Response> => {
  if (url.pathname !== ACTION_TRACKING_PATH) return answer(404);
  if (request.method !== 'POST') return answer(405);
  if (isPrivateRequest(request.headers)) return answer(204);
  if (env.ACTION_ANALYTICS_ENABLED !== 'true' || !env.ANALYTICS)
    return answer(503);
  if (request.headers.get('Origin') !== url.origin) return answer(403);
  if (request.headers.get('Content-Type') !== 'application/json')
    return answer(415);
  const budget = RATE_BUDGETS.telemetry.actions;
  const address = `ip:${request.headers.get('cf-connecting-ip') ?? 'unknown'}`;
  try {
    if (
      !(await consumeRateBudget(
        address,
        budget.action,
        budget.limit,
        budget.windowMs,
      ))
    )
      return answer(204);
  } catch {
    return answer(503);
  }
  const bytes = await readBounded(request, 1024);
  if (!bytes) return answer(413);
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return answer(400);
  }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return answer(400);
  const action = parsed.data;
  try {
    createMetrics(env.ANALYTICS, {
      environment: env.APP_ENVIRONMENT ?? 'unknown',
    }).trackEvent(action.event, {
      market: action.market,
      city: action.city,
      locale: action.locale,
      page: action.page,
      attribution: action.attribution,
    });
  } catch {
    return answer(503);
  }
  return answer(204);
};
