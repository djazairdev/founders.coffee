import type { Db } from '@founders-coffee/db';

import {
  criterion,
  founderTrack,
  hackathonWithDetails,
  ORGANISATION,
} from './edit.fixtures.js';
import { submitHackathonForReviewResolver } from './review.js';
import { saveHackathonRubricResolver } from './rubric.js';
import { saveHackathonTracksResolver } from './tracks.js';

/** A drafted hackathon with its details, a track and a rubric saved, ready to send for review. */
export const readyHackathon = async (db: Db) => {
  const { eventId, version } = await hackathonWithDetails(db);
  const tracks = await saveHackathonTracksResolver(db, {
    eventId,
    version,
    organisationId: ORGANISATION,
    tracks: [{ id: null, track: founderTrack('Payments for cafés') }],
  });
  if (!tracks.ok) throw tracks.error;
  const rubric = await saveHackathonRubricResolver(db, {
    eventId,
    version: tracks.data.version,
    organisationId: ORGANISATION,
    criteria: [
      { id: null, criterion: criterion('Impact', 40) },
      { id: null, criterion: criterion('Craft', 30) },
      { id: null, criterion: criterion('Demo', 30) },
    ],
  });
  if (!rubric.ok) throw rubric.error;
  return { eventId, version: rubric.data.version };
};

/** A hackathon sent for review, at the version that left it. */
export const submittedHackathon = async (db: Db) => {
  const { eventId, version } = await readyHackathon(db);
  const submitted = await submitHackathonForReviewResolver(db, {
    eventId,
    version,
    organisationId: ORGANISATION,
  });
  if (!submitted.ok) throw submitted.error;
  return { eventId, version: submitted.data.version };
};
