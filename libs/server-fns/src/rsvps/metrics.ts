import type { Campaign } from '@founders-coffee/core';
import type { Event } from '@founders-coffee/db';
import { reportError, type Metrics } from '@founders-coffee/observability';

/** Count a committed seat once; an analytics failure never changes the RSVP result. */
export const recordRsvpCreated = (
  metrics: Metrics | null | undefined,
  event: Event,
  attribution?: Campaign,
): void => {
  try {
    metrics?.trackEvent('rsvps_created', {
      market: event.marketCode,
      city: event.cityCode,
      locale: event.language,
      ...(attribution ? { attribution } : {}),
    });
  } catch (error) {
    reportError(error, { operation: 'rsvps_created' });
  }
};
