import {
  AppError,
  err,
  id,
  ok,
  type AttendanceMode,
  type Result,
} from '@founders-coffee/core';
import {
  createHackathonRegistration,
  getHackathon,
  getUser,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { logger, type Metrics } from '@founders-coffee/observability';

import { enqueueHackathonRegistrationNotice } from '../notifications/hackathon-registration.js';
import { scheduleParticipantReminders } from '../notifications/hackathon-reminders.js';
import { requireHackathonsEnabled } from './flag.js';
import { recordHackathonMetric } from './metrics.js';

export type RegistrationInput = {
  readonly eventId: string;
  readonly userId: string;
  readonly attendanceMode: AttendanceMode;
  readonly isAgeAttested: boolean;
  readonly isLookingForTeam: boolean;
  readonly skills: string | null;
};

export type RegistrationCreated = {
  readonly registrationId: string;
  readonly status: 'registered' | 'waitlisted';
};

const notFound = () => new AppError('event_not_found', 'Event not found');

/**
 * Register the signed-in member for a published hackathon (B-REG-03).
 *
 * The hackathon's rules decide first, in the order a member can act on them: registration has to be
 * open, the way they attend has to be one the format offers, and a minimum age has to be attested
 * (`registration_closed`, `attendance_mode_unavailable`, `not_eligible`). Accepting the code of
 * conduct is the request's own condition. The write then re-checks the dates and the event in one
 * atomic batch and decides the place against the count it updates, so a hackathon filling up between
 * the read and the write puts the member on the waitlist rather than over capacity. A member already
 * registered, in any status, is told `already_registered`. A member who got a place, or a place on
 * the waitlist, is then told which (B-REG-07).
 */
export const registerForHackathonResolver = async (
  db: Db,
  metrics: Metrics | null,
  input: RegistrationInput,
  now: number = Date.now(),
): Promise<Result<RegistrationCreated>> => {
  const found = await getHackathon(db, input.eventId);
  if (!found || found.event.status !== 'published') return err(notFound());
  const { event, hackathon } = found;
  const closed = await requireHackathonsEnabled(db, event.marketCode);
  if (closed) return err(closed);
  const decided = hackathons.decideRegistration({
    timeline: {
      registrationOpensAt: hackathon.registrationOpensAt.getTime(),
      registrationClosesAt: hackathon.registrationClosesAt.getTime(),
      kickoffAt: event.startsAt.getTime(),
      submissionDeadlineAt: hackathon.submissionDeadlineAt.getTime(),
      endsAt: (event.endsAt ?? event.startsAt).getTime(),
      judgingEndsAt: hackathon.judgingEndsAt.getTime(),
    },
    format: event.format,
    attendanceMode: input.attendanceMode,
    minimumAge: hackathon.minimumAge,
    isAgeAttested: input.isAgeAttested,
    capacity: hackathon.capacity,
    registeredCount: hackathon.registeredCount,
    now,
  });
  if (!decided.ok) return decided;
  const registrationId = id('reg');
  const accepted = new Date(now);
  const written = await createHackathonRegistration(db, {
    id: registrationId,
    eventId: input.eventId,
    userId: input.userId,
    attendanceMode: input.attendanceMode,
    codeOfConductAcceptedAt: accepted,
    ageAttestedAt:
      hackathon.minimumAge !== null && input.isAgeAttested ? accepted : null,
    isLookingForTeam: input.isLookingForTeam,
    skills: input.skills,
  });
  if (written.outcome === 'already_registered')
    return err(
      new AppError(
        'already_registered',
        'You are already registered for this hackathon',
      ),
    );
  if (written.outcome === 'registration_closed')
    return err(new AppError('registration_closed', 'Registration is not open'));
  recordHackathonMetric(metrics, 'registration_created', {
    marketCode: event.marketCode,
    hackathonId: event.id,
  });
  logger.info('hackathon.registered', {
    eventId: event.id,
    marketCode: event.marketCode,
    status: written.status,
  });
  const locale = (await getUser(db, input.userId))?.localePref;
  await enqueueHackathonRegistrationNotice(db, {
    templateKey:
      written.status === 'registered'
        ? 'hackathon_registered'
        : 'hackathon_waitlisted',
    eventId: event.id,
    userId: input.userId,
    eventTitle: event.title,
    eventSlug: event.slug,
    marketCode: event.marketCode,
    startsAt: event.startsAt,
    venue: event.venue,
    locale,
  });
  if (written.status === 'registered')
    await scheduleParticipantReminders(db, {
      eventId: event.id,
      userId: input.userId,
      locale,
    });
  return ok({ registrationId, status: written.status });
};
