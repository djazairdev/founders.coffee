import type { EventKind } from '@founders-coffee/core';

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export const EVENT_DURATION_MINUTES_MIN = 30;
export const EVENT_DURATION_MINUTES_MAX = 8 * 60;
export const EVENT_DURATION_MS_MIN = EVENT_DURATION_MINUTES_MIN * MINUTE_MS;
export const EVENT_DURATION_MS_MAX = EVENT_DURATION_MINUTES_MAX * MINUTE_MS;
export const HACKATHON_DURATION_DAYS_MAX = 14;

export type EventDurationLimits = {
  readonly minMs: number;
  readonly maxMs: number;
};

const LIMITS: Readonly<Record<EventKind, EventDurationLimits>> = {
  meetup: { minMs: EVENT_DURATION_MS_MIN, maxMs: EVENT_DURATION_MS_MAX },
  workshop: { minMs: EVENT_DURATION_MS_MIN, maxMs: EVENT_DURATION_MS_MAX },
  hackathon: {
    minMs: EVENT_DURATION_MS_MIN,
    maxMs: HACKATHON_DURATION_DAYS_MAX * DAY_MS,
  },
};

/**
 * How short and how long an event of this type may run.
 *
 * A meetup or a workshop is an evening or a day: thirty minutes to eight hours. A hackathon runs
 * from its kickoff to its demo day, so it may last up to fourteen days.
 */
export const eventDurationLimits = (kind: EventKind): EventDurationLimits =>
  LIMITS[kind];

/** Whether an event of this type may run for `durationMs`, both bounds included. */
export const isEventDurationAllowed = (
  kind: EventKind,
  durationMs: number,
): boolean => {
  const { minMs, maxMs } = eventDurationLimits(kind);
  return durationMs >= minMs && durationMs <= maxMs;
};
