import { events } from '@founders-coffee/domain';
import {
  getZonedWallClock,
  hackathon_schedule_range,
  host_time_past,
  resolveZonedDateTime,
  type Locale,
  type ZonedDateTimeError,
} from '@founders-coffee/i18n';

import type { HostCreateStepCheck } from '../events/host-create-validation';

const DAY_MS = 86_400_000;

export const HACKATHON_MAX_DAYS =
  events.eventDurationLimits('hackathon').maxMs / DAY_MS;

export const DEFAULT_KICKOFF_TIME = '09:00';
export const DEFAULT_DEMO_DAY_TIME = '18:00';

export type ScheduleDays = {
  readonly from?: Date;
  readonly to?: Date;
};

export type HackathonScheduleResolution =
  | {
      readonly ok: true;
      readonly startsAt: number | null;
      readonly endsAt: number | null;
    }
  | { readonly ok: false; readonly reason: ZonedDateTimeError };

const pad = (value: number) => String(value).padStart(2, '0');

/** The wall-clock time, `HH:MM`, an instant shows in the market's time zone. */
export const wallTime = (epochMs: number, timeZone: string): string => {
  const clock = getZonedWallClock(epochMs, timeZone);
  return `${pad(clock.hour)}:${pad(clock.minute)}`;
};

const parseTime = (value: string): { hour: number; minute: number } | null => {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  return match ? { hour: Number(match[1]), minute: Number(match[2]) } : null;
};

const resolveAt = (
  day: Date,
  time: string,
  timeZone: string,
):
  { ok: true; epochMs: number } | { ok: false; reason: ZonedDateTimeError } => {
  const clock = parseTime(time);
  if (!clock) return { ok: false, reason: 'invalid_wall_time' };
  const resolved = resolveZonedDateTime(
    {
      year: day.getFullYear(),
      month: day.getMonth() + 1,
      day: day.getDate(),
      ...clock,
    },
    timeZone,
  );
  return resolved.ok
    ? { ok: true, epochMs: resolved.epochMs }
    : { ok: false, reason: resolved.reason };
};

/**
 * Kickoff and the end of demo day as instants, from the days picked on the calendar and the two
 * times, read in the market's time zone. One day picked is a hackathon that ends the day it starts.
 * No day yet is no schedule yet, and a time that does not exist there says why.
 */
export const resolveHackathonSchedule = (
  days: ScheduleDays | undefined,
  kickoffTime: string,
  demoDayTime: string,
  timeZone: string,
): HackathonScheduleResolution => {
  const kickoffDay = days?.from;
  if (!kickoffDay) return { ok: true, startsAt: null, endsAt: null };
  const start = resolveAt(kickoffDay, kickoffTime, timeZone);
  if (!start.ok) return start;
  const end = resolveAt(days.to ?? kickoffDay, demoDayTime, timeZone);
  if (!end.ok) return end;
  return { ok: true, startsAt: start.epochMs, endsAt: end.epochMs };
};

/**
 * What holds the schedule step back: no day yet is a gap (null); a kickoff already gone, or a demo
 * day before kickoff or more than the hackathon's limit after it, comes with the message that says
 * why.
 */
export const validateHackathonSchedule = (
  startsAt: number | null,
  endsAt: number | null,
  locale: Locale,
): HostCreateStepCheck => {
  if (startsAt === null || endsAt === null) return { schedule: null };
  if (startsAt <= Date.now())
    return { schedule: host_time_past({}, { locale }) };
  if (!events.isEventDurationAllowed('hackathon', endsAt - startsAt))
    return {
      schedule: hackathon_schedule_range(
        { days: HACKATHON_MAX_DAYS },
        { locale },
      ),
    };
  return {};
};
