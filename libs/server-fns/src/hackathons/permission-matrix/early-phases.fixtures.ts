import { id, type Result } from '@founders-coffee/core';
import {
  eq,
  hackathons as hackathonTable,
  listOrganiserHackathonPrizes,
  readHackathonDraft,
  type Db,
} from '@founders-coffee/db';
import { hackathons as hackathonSchemas } from '@founders-coffee/domain';

import { decideHackathonReviewResolver } from '../../admin/hackathon-review.js';
import { TEST_HOST_ID } from '../../events/resolver.fixtures.js';
import { newSecretToken } from '../../secret-tokens.js';
import { ORGANISATION, prize } from '../edit.fixtures.js';
import {
  answerJudgeInviteResolver,
  createJudgeInviteResolver,
} from '../judges.js';
import {
  answerMentorInviteResolver,
  createMentorInviteResolver,
} from '../mentors.js';
import type { Organiser } from '../places.js';
import { addHackathonPrizeResolver } from '../prizes.js';
import { registerForHackathonResolver } from '../registration.js';
import { reportHackathonTargetResolver } from '../reports.js';
import { readyHackathon } from '../review.fixtures.js';
import { createHackathonTeamResolver } from '../team-creation.js';
import {
  createTeamInviteResolver,
  joinTeamByInviteResolver,
} from '../team-invites.js';
import { requestToJoinTeamResolver } from '../team-requests.js';
import { ACTORS, type Actor } from './matrix.fixtures.js';
import {
  MENTOR_NOTE,
  moveDates,
  OPEN_DATES,
  unwrap,
  type Cast,
  type Extra,
  type Ids,
  type World,
} from './world.fixtures.js';

/** One invite link per actor, so that each answers their own and no answer touches another's. */
const answerTokensFor = async (
  db: Db,
  organiser: Organiser,
  extra?: Extra,
): Promise<World['answerTokens']> => {
  if (extra !== 'judgeAnswers' && extra !== 'mentorAnswers') return {};
  const invite: (
    db: Db,
    input: Organiser,
  ) => Promise<Result<{ readonly token: string }>> =
    extra === 'judgeAnswers'
      ? createJudgeInviteResolver
      : createMentorInviteResolver;
  const tokens: [Actor, string][] = [];
  for (const actor of ACTORS)
    tokens.push([actor, unwrap(await invite(db, organiser)).token]);
  return Object.fromEntries(tokens);
};

/** A hackathon ready for review, with an unconfirmed prize, an accepted judge and spare invites. */
export const drafted = async (
  db: Db,
  cast: Cast,
  extra?: Extra,
): Promise<Ids> => {
  const { eventId, version } = await readyHackathon(db);
  const organiser = {
    eventId,
    userId: cast.organiser.userId,
    organisationId: ORGANISATION,
  };
  unwrap(
    await addHackathonPrizeResolver(db, {
      ...organiser,
      version,
      prize: prize(),
    }),
  );
  const [prizeRow] = await listOrganiserHackathonPrizes(db, eventId);
  const judgeInvite = unwrap(await createJudgeInviteResolver(db, organiser));
  unwrap(
    await answerJudgeInviteResolver(db, {
      token: judgeInvite.token,
      answer: 'accept',
      userId: cast.judge.userId,
    }),
  );
  if (extra === 'registeredMentor') {
    const { token } = unwrap(await createMentorInviteResolver(db, organiser));
    unwrap(
      await answerMentorInviteResolver(db, {
        token,
        answer: 'accept',
        note: MENTOR_NOTE,
        userId: cast.registered.userId,
      }),
    );
  }
  const spareJudge = unwrap(await createJudgeInviteResolver(db, organiser));
  const spareMentor = unwrap(await createMentorInviteResolver(db, organiser));
  return {
    eventId,
    organisationId: ORGANISATION,
    prizeId: prizeRow?.id ?? '',
    spareJudgeId: spareJudge.judgeId,
    spareMentorId: spareMentor.mentorId,
    answerTokens: await answerTokensFor(db, organiser, extra),
    teamId: id('tea'),
    teamInviteToken: newSecretToken(),
    requestId: id('treq'),
    submissionId: id('sub'),
    entryVersion: 0,
    projectId: id('prj'),
    cast,
  };
};

const versionOf = async (db: Db, eventId: string): Promise<number> =>
  (await readHackathonDraft(db, eventId))?.event.version ?? 0;

export const inReview = async (
  db: Db,
  cast: Cast,
  extra?: Extra,
): Promise<Ids> => {
  const seed = await drafted(db, cast, extra);
  await db
    .update(hackathonTable)
    .set({ reviewStatus: 'submitted' })
    .where(eq(hackathonTable.eventId, seed.eventId));
  return seed;
};

/** Approved and open for registration, with the team, its two members and a third registered. */
export const opened = async (
  db: Db,
  cast: Cast,
  extra?: Extra,
): Promise<Ids> => {
  const seed = await inReview(db, cast, extra);
  const { eventId } = seed;
  unwrap(
    await decideHackathonReviewResolver(db, () => Promise.resolve(), null, {
      decision: hackathonSchemas.hackathonReviewDecisionSchema.parse({
        eventId,
        version: await versionOf(db, eventId),
        decision: 'approve',
      }),
      actorUserId: TEST_HOST_ID,
      accessSubject: null,
    }),
  );
  await moveDates(db, eventId, OPEN_DATES);
  for (const actor of ['captain', 'member', 'registered'] as const)
    unwrap(
      await registerForHackathonResolver(db, null, {
        eventId,
        userId: cast[actor].userId,
        attendanceMode: 'online',
        isAgeAttested: false,
        isLookingForTeam: true,
        skills: null,
      }),
    );
  const { teamId } = unwrap(
    await createHackathonTeamResolver(db, null, {
      eventId,
      userId: cast.captain.userId,
      name: 'Byte Club',
      description: null,
      isLookingForMembers: true,
    }),
  );
  const { token } = unwrap(
    await createTeamInviteResolver(db, {
      eventId,
      userId: cast.captain.userId,
    }),
  );
  unwrap(
    await joinTeamByInviteResolver(db, { token, userId: cast.member.userId }),
  );
  if (extra === 'report')
    unwrap(
      await reportHackathonTargetResolver(db, {
        eventId,
        targetType: 'team',
        targetId: teamId,
        reason: 'plagiarism',
        reporterId: TEST_HOST_ID,
      }),
    );
  const requestId =
    extra === 'teamRequest'
      ? unwrap(
          await requestToJoinTeamResolver(db, {
            eventId,
            teamId,
            userId: cast.registered.userId,
          }),
        ).requestId
      : seed.requestId;
  return { ...seed, teamId, teamInviteToken: token, requestId };
};
