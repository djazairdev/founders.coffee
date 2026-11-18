import {
  listHackathonCriteria,
  listHackathonTracks,
  readHackathonDraft,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { cancelEventResolver } from '../../events/cancel.js';
import { TEST_HOST_ID } from '../../events/resolver.fixtures.js';
import {
  confirmProjectListingResolver,
  createProjectFromEntryResolver,
} from '../../projects/from-entry.js';
import { detailsInputOf } from '../edit-context.js';
import { saveJudgeScoresResolver } from '../judge-scores.js';
import { publishHackathonResultsResolver } from '../results.js';
import { saveSubmissionDraftResolver } from '../submission-drafts.js';
import { submitSubmissionResolver } from '../submission-submit.js';
import { drafted, inReview, opened } from './early-phases.fixtures.js';
import type { Phase } from './matrix.fixtures.js';
import {
  BUILDING_DATES,
  JUDGED_DATES,
  JUDGING_DATES,
  moveDates,
  PULL_REQUEST_URL,
  unwrap,
  type Cast,
  type Extra,
  type Ids,
  type World,
} from './world.fixtures.js';

/** Kickoff passed, the deadline ahead, and the captain's complete draft saved. */
const building = async (db: Db, cast: Cast, extra?: Extra): Promise<Ids> => {
  const seed = await opened(db, cast, extra);
  const { eventId } = seed;
  await moveDates(db, eventId, BUILDING_DATES);
  const [track] = await listHackathonTracks(db, eventId);
  const saved = unwrap(
    await saveSubmissionDraftResolver(db, {
      eventId,
      userId: cast.captain.userId,
      version: 0,
      draft: entryDraft(track?.id ?? ''),
    }),
  );
  return {
    ...seed,
    submissionId: saved.submissionId,
    entryVersion: saved.version,
  };
};

/** The draft every captain in the matrix saves: complete, so it can also be submitted. */
export const entryDraft = (trackId: string) =>
  hackathons.submissionDraftSchema.parse({
    trackId,
    title: 'Ledger',
    description: 'A ledger a corner shop keeps on its phone.',
    repositoryUrl: 'https://github.com/byte-club/ledger',
    pullRequestUrls: [PULL_REQUEST_URL],
    aiTools: ['An assistant'],
    aiStatement: 'We used an assistant for the first draft of the tests.',
  });

/** The entry submitted, the deadline passed and judging open, with nothing scored. */
const judging = async (db: Db, cast: Cast, extra?: Extra): Promise<Ids> => {
  const seed = await building(db, cast, extra);
  const sent = unwrap(
    await submitSubmissionResolver(db, null, {
      eventId: seed.eventId,
      userId: cast.captain.userId,
      version: seed.entryVersion,
    }),
  );
  await moveDates(db, seed.eventId, JUDGING_DATES);
  return { ...seed, entryVersion: sent.version };
};

/** Scored, judging over, results not out: the only moment results can be published. */
const judged = async (db: Db, cast: Cast, extra?: Extra): Promise<Ids> => {
  const seed = await judging(db, cast, extra);
  const criteria = await listHackathonCriteria(db, seed.eventId);
  unwrap(
    await saveJudgeScoresResolver(db, {
      eventId: seed.eventId,
      submissionId: seed.submissionId,
      userId: cast.judge.userId,
      scores: criteria.map(({ id: criterionId }) => ({
        criterionId,
        value: 8,
        comment: null,
      })),
    }),
  );
  await moveDates(db, seed.eventId, JUDGED_DATES);
  return seed;
};

/** Results published; the project exists only when the operation under test needs it. */
const published = async (db: Db, cast: Cast, extra?: Extra): Promise<Ids> => {
  const seed = await judged(db, cast, extra);
  const { eventId } = seed;
  unwrap(
    await publishHackathonResultsResolver(db, null, {
      ...hackathons.publishResultsSchema.parse({ eventId }),
      actorUserId: TEST_HOST_ID,
    }),
  );
  if (extra !== 'project' && extra !== 'confirmedProject') return seed;
  const { projectId } = unwrap(
    await createProjectFromEntryResolver(db, null, {
      eventId,
      userId: cast.captain.userId,
    }),
  );
  if (extra === 'confirmedProject')
    unwrap(
      await confirmProjectListingResolver(db, {
        projectId,
        userId: cast.member.userId,
      }),
    );
  return { ...seed, projectId };
};

/** Called off during judging, the latest it can be: a submitted entry, and only the status changed. */
const cancelled = async (db: Db, cast: Cast, extra?: Extra): Promise<Ids> => {
  const seed = await judging(db, cast, extra);
  unwrap(
    await cancelEventResolver(db, {
      eventId: seed.eventId,
      actorId: TEST_HOST_ID,
    }),
  );
  return seed;
};

const BUILDERS: Readonly<
  Record<Phase, (db: Db, cast: Cast, extra?: Extra) => Promise<Ids>>
> = {
  draft: drafted,
  review: inReview,
  open: opened,
  building,
  judging,
  judged,
  results: published,
  cancelled,
};

/**
 * A hackathon in a phase, with fresh ids, so seeds never collide, built by the resolvers members and
 * organisers use, with only the dates moved by hand.
 *
 * Beyond the phases the ticket names, three are here because a real rule turns on them: `review`,
 * since only a hackathon with the reviewers can be decided, and it refuses every edit; `judged`,
 * since results can be published only between the end of judging and their own publication; and
 * `cancelled`, since `canChangePlaces`, `isHackathonEditable`, `judgingStageAt` and
 * `loadTeamHackathon` each name it. A draft or a hackathon under review has nobody registered, so
 * there the captain, the member and the registered actor hold no rows, as nobody can.
 */
export const seedWorld = async (
  db: Db,
  cast: Cast,
  phase: Phase,
  extra?: Extra,
): Promise<World> => {
  const seed = await BUILDERS[phase](db, cast, extra);
  const [rows, tracks, criteria] = await Promise.all([
    readHackathonDraft(db, seed.eventId),
    listHackathonTracks(db, seed.eventId),
    listHackathonCriteria(db, seed.eventId),
  ]);
  if (!rows?.details) throw new Error('A seed lost its hackathon');
  return {
    ...seed,
    version: rows.event.version,
    details: detailsInputOf(rows.details),
    trackId: tracks[0]?.id ?? '',
    criterionIds: criteria.map((criterion) => criterion.id),
  };
};
