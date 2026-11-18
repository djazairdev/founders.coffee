import { err, ok, type EventStatus, type Result } from '@founders-coffee/core';
import {
  getEvent,
  getHackathon,
  readHackathonDashboardCounts,
  type Db,
  type HackathonDashboardCounts,
} from '@founders-coffee/db';

import {
  hackathonScheduleOf,
  type HackathonSchedule,
} from '../events/hackathon-schedule.js';
import { hackathonNotFound } from './edit-context.js';
import { requireHackathonsEnabled } from './flag.js';

export type HackathonDashboard = {
  readonly eventId: string;
  readonly slug: string;
  readonly marketCode: string;
  readonly status: EventStatus;
  readonly capacity: number | null;
  readonly schedule: HackathonSchedule | null;
  readonly counts: HackathonDashboardCounts;
};

/**
 * A hackathon at a glance for its organisers (B-OPS-01): the phase it is in, decided here from its
 * dates when its details exist, and the counts of its registrations, teams, entries and judging.
 * The middleware has checked that the reader may manage it.
 */
export const hackathonDashboardResolver = async (
  db: Db,
  eventId: string,
  now: number = Date.now(),
): Promise<Result<HackathonDashboard>> => {
  const found = await getHackathon(db, eventId);
  const event = found?.event ?? (await getEvent(db, eventId));
  if (!event || event.kind !== 'hackathon') return hackathonNotFound();
  const disabled = await requireHackathonsEnabled(db, event.marketCode);
  if (disabled) return err(disabled);
  const hackathon = found?.hackathon ?? null;
  const schedule = hackathon
    ? hackathonScheduleOf(event, hackathon, now)
    : null;
  if (hackathon && !schedule) return hackathonNotFound();
  return ok({
    eventId: event.id,
    slug: event.slug,
    marketCode: event.marketCode,
    status: event.status,
    capacity: hackathon?.capacity ?? null,
    schedule,
    counts: await readHackathonDashboardCounts(db, eventId),
  });
};
