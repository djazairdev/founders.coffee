import { z } from 'zod';

import { AppError, err, type Result } from '@founders-coffee/core';
import {
  hackathonDetailsWrite,
  syncChatChannel,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { moveHackathonReminders } from '../notifications/hackathon-reminders.js';
import { loadHackathonEdit, runHackathonEdit } from './edit-context.js';

/** The details the database stores, with every optional value the organiser left out as `null`. */
const storedDetails = (details: hackathons.HackathonDetailsInput) => ({
  rules: details.rules ?? null,
  minimumAge: details.minimumAge ?? null,
  attendanceModes: details.attendanceModes,
  teamMin: details.teamMin,
  teamMax: details.teamMax,
  capacity: details.capacity ?? null,
  registrationOpensAt: new Date(details.registrationOpensAt),
  registrationClosesAt: new Date(details.registrationClosesAt),
  submissionDeadlineAt: new Date(details.submissionDeadlineAt),
  judgingEndsAt: new Date(details.judgingEndsAt),
  aiPolicy: details.aiPolicy,
  aiPolicyNote: details.aiPolicyNote ?? null,
  licenceNote: details.licenceNote ?? null,
});

/**
 * Save a hackathon's rules, eligibility, attendance, team size, places, timeline, AI policy and
 * licence (B-HKN-12), at any stage that still allows it (B-HKN-07).
 *
 * The details are held to the saved event, whose kickoff, demo day and format they depend on, and
 * to what the hackathon's stage allows: once registration opens, the rules people registered under
 * stay, places only grow and dates only move later, and the fields that would break that promise
 * come back as `hackathon_field_locked`. The write lands only on the version the organiser saw, with
 * the version bump, and answers the new version. Saving again replaces what was saved.
 */
export const saveHackathonDetailsResolver = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly version: number;
    readonly organisationId: string;
    readonly details: hackathons.HackathonDetailsInput;
  },
  now: number = Date.now(),
): Promise<Result<{ readonly eventId: string; readonly version: number }>> => {
  const loaded = await loadHackathonEdit(db, input, now);
  if (!loaded.ok) return loaded;
  const { event } = loaded.data.rows;
  const checked = hackathons
    .hackathonDetailsFor({
      startsAt: event.startsAt.getTime(),
      endsAt: event.endsAt.getTime(),
      format: event.format,
    })
    .safeParse(input.details);
  if (!checked.success) {
    const flat = z.flattenError(checked.error);
    return err(
      new AppError('validation_failed', 'The details do not fit the event', {
        fields: flat.fieldErrors,
        formErrors: flat.formErrors,
      }),
    );
  }
  const locked = hackathons.lockedDetailChanges(
    loaded.data.details,
    checked.data,
    loaded.data.stage,
    now,
  );
  if (locked.length > 0)
    return err(
      new AppError(
        'hackathon_field_locked',
        'Registration has opened, so these details cannot change that way',
        { fields: locked },
      ),
    );
  const saved = await runHackathonEdit(db, loaded.data, {
    operation: 'hackathon_details_saved',
    organisationId: input.organisationId,
    writes: [
      hackathonDetailsWrite(db, {
        eventId: input.eventId,
        version: input.version,
        details: storedDetails(checked.data),
      }),
      syncChatChannel(db, input.eventId),
    ],
  });
  if (saved.ok) await moveHackathonReminders(db, input.eventId, now);
  return saved;
};
