import { batch } from './atomic.js';
import type { Db } from './db.js';
import { baseEvent } from './events.fixtures.js';
import { insertHackathonDetails, type HackathonDetails } from './hackathons.js';
import { events, type NewEvent } from './schema.js';

let sequence = 0;

export const hackathonEventRow = (
  kind: NewEvent['kind'] = 'hackathon',
): NewEvent => {
  sequence += 1;
  return {
    ...baseEvent,
    id: `evt_hkn${String(sequence).padStart(3, '0')}`,
    slug: `hackathon-${sequence}`,
    kind,
    format: 'online',
    venue: null,
    startsAt: new Date('2099-01-22T09:00:00Z'),
    endsAt: new Date('2099-01-30T18:00:00Z'),
  };
};

export const hackathonDetails: HackathonDetails = {
  rules: 'Build something useful for your city in a week.',
  minimumAge: 16,
  attendanceModes: ['online'],
  teamMin: 2,
  teamMax: 5,
  capacity: 200,
  registrationOpensAt: new Date('2099-01-04T09:00:00Z'),
  registrationClosesAt: new Date('2099-01-20T23:00:00Z'),
  submissionDeadlineAt: new Date('2099-01-29T18:00:00Z'),
  judgingEndsAt: new Date('2099-02-05T18:00:00Z'),
  aiPolicy: 'disclosed',
  aiPolicyNote: 'Say which tools you used.',
  licenceNote: 'Teams keep their code.',
};

export const createHackathon = (
  db: Db,
  row: NewEvent,
  values: HackathonDetails = hackathonDetails,
) =>
  batch(db, [
    db.insert(events).values(row).onConflictDoNothing(),
    insertHackathonDetails(db, { eventId: row.id, details: values }),
  ]);
