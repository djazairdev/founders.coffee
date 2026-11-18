import {
  listJudgeEntriesResolver,
  recuseFromEntryResolver,
} from '../judge-entries.js';
import { judgeEntryPageResolver, judgePageResolver } from '../judge-page.js';
import { saveJudgeScoresResolver } from '../judge-scores.js';
import {
  answerJudgeInviteResolver,
  createJudgeInviteResolver,
  listJudgesResolver,
  removeJudgeResolver,
} from '../judges.js';
import {
  answerMentorInviteResolver,
  createMentorInviteResolver,
  listMentorsResolver,
  removeMentorResolver,
  saveMentorNoteResolver,
} from '../mentors.js';
import { placeInviteResolver } from '../place-invite.js';
import {
  everyone,
  everyoneBut,
  inEveryPhase,
  judgeWhileJudging,
  may,
  ORGANISER,
  organiserOnly,
  selfOf,
  type Call,
  type Cells,
  type Operations,
  type Row,
} from './matrix.fixtures.js';
import { MENTOR_NOTE } from './world.fixtures.js';

const organiser = ({ world, userId }: Call) => ({
  eventId: world.eventId,
  userId,
  organisationId: world.organisationId,
});

const scoreable = (call: Call) => ({
  ...selfOf(call),
  submissionId: call.world.submissionId,
});

const WHILE_PLACES_CHANGE = {
  judged: 'judging_closed',
  results: 'judging_closed',
  cancelled: 'hackathon_not_editable',
};

/** An invite link is the permission to answer it, so anyone holding one gets its answer. */
const answeringAnInvite = (
  forJudge: string,
  onceParticipating: Partial<Row> = {},
): Cells => {
  const whileRegistered = everyoneBut('ok', {
    judge: forJudge,
    ...onceParticipating,
  });
  return inEveryPhase(everyoneBut('ok', { judge: forJudge }), {
    open: whileRegistered,
    building: whileRegistered,
    judging: whileRegistered,
    judged: everyone('judging_closed'),
    results: everyone('judging_closed'),
    cancelled: everyone('hackathon_not_editable'),
  });
};

/** A judge's page says nothing to anyone else until the hackathon is public. */
const judgePageCells = (): Cells => {
  const hidden = everyoneBut('event_not_found', { judge: 'ok' });
  return inEveryPhase(everyone('ok'), { draft: hidden, review: hidden });
};

export const JUDGING_OPERATIONS: Operations = {
  getHackathonPlaceInvite: {
    gate: may('hackathon', 'register'),
    needs: 'judgeAnswers',
    run: ({ db, world, actor, userId }) =>
      placeInviteResolver(db, {
        role: 'judge',
        token: world.answerTokens[actor] ?? '',
        userId,
      }),
    cells: inEveryPhase(everyone('ok'), {
      judged: everyone('judging_closed'),
      results: everyone('judging_closed'),
      cancelled: everyone('hackathon_not_editable'),
    }),
  },
  getHackathonJudgeEntries: {
    gate: may('judging', 'score'),
    run: (call) => listJudgeEntriesResolver(call.db, selfOf(call)),
    cells: judgeWhileJudging(),
  },
  getHackathonJudgePage: {
    gate: may('judging', 'score'),
    run: (call) => judgePageResolver(call.db, selfOf(call)),
    cells: judgePageCells(),
  },
  getHackathonJudgeEntryPage: {
    gate: may('judging', 'score'),
    run: (call) => judgeEntryPageResolver(call.db, scoreable(call)),
    cells: judgePageCells(),
  },
  recuseFromHackathonEntry: {
    gate: may('judging', 'score'),
    changesWorld: true,
    run: (call) =>
      recuseFromEntryResolver(call.db, {
        ...scoreable(call),
        reason: 'I advised this team last year.',
      }),
    cells: judgeWhileJudging(),
  },
  saveHackathonScores: {
    gate: may('judging', 'score'),
    changesWorld: true,
    run: (call) =>
      saveJudgeScoresResolver(call.db, {
        ...scoreable(call),
        scores: call.world.criterionIds.map((criterionId) => ({
          criterionId,
          value: 7,
          comment: null,
        })),
      }),
    cells: judgeWhileJudging(),
  },
  listHackathonJudges: {
    gate: ORGANISER,
    run: ({ db, world }) => listJudgesResolver(db, world.eventId),
    cells: organiserOnly('ok'),
  },
  createHackathonJudgeInvite: {
    gate: ORGANISER,
    run: (call) => createJudgeInviteResolver(call.db, organiser(call)),
    cells: organiserOnly('ok', WHILE_PLACES_CHANGE),
  },
  removeHackathonJudge: {
    gate: ORGANISER,
    changesWorld: true,
    run: ({ db, world }) =>
      removeJudgeResolver(db, {
        eventId: world.eventId,
        organisationId: world.organisationId,
        judgeId: world.spareJudgeId,
      }),
    cells: organiserOnly('ok', WHILE_PLACES_CHANGE),
  },
  answerHackathonJudgeInvite: {
    gate: may('judging', 'score'),
    needs: 'judgeAnswers',
    run: ({ db, world, actor, userId }) =>
      answerJudgeInviteResolver(db, {
        token: world.answerTokens[actor] ?? '',
        answer: 'accept',
        userId,
      }),
    cells: answeringAnInvite('already_judge', {
      captain: 'already_registered',
      member: 'already_registered',
      registered: 'already_registered',
    }),
  },
  listHackathonMentors: {
    gate: ORGANISER,
    run: ({ db, world }) => listMentorsResolver(db, world.eventId),
    cells: organiserOnly('ok'),
  },
  createHackathonMentorInvite: {
    gate: ORGANISER,
    run: (call) => createMentorInviteResolver(call.db, organiser(call)),
    cells: organiserOnly('ok', WHILE_PLACES_CHANGE),
  },
  removeHackathonMentor: {
    gate: ORGANISER,
    changesWorld: true,
    run: ({ db, world }) =>
      removeMentorResolver(db, {
        eventId: world.eventId,
        organisationId: world.organisationId,
        mentorId: world.spareMentorId,
      }),
    cells: organiserOnly('ok', WHILE_PLACES_CHANGE),
  },
  answerHackathonMentorInvite: {
    gate: may('hackathon', 'register'),
    needs: 'mentorAnswers',
    run: ({ db, world, actor, userId }) =>
      answerMentorInviteResolver(db, {
        token: world.answerTokens[actor] ?? '',
        answer: 'accept',
        note: MENTOR_NOTE,
        userId,
      }),
    cells: answeringAnInvite('already_judge'),
  },
  saveHackathonMentorNote: {
    gate: may('hackathon', 'register'),
    needs: 'registeredMentor',
    run: (call) =>
      saveMentorNoteResolver(call.db, { ...selfOf(call), note: MENTOR_NOTE }),
    cells: inEveryPhase(everyoneBut('not_mentor', { registered: 'ok' }), {
      judged: everyoneBut('not_mentor', { registered: 'judging_closed' }),
      results: everyoneBut('not_mentor', { registered: 'judging_closed' }),
      cancelled: everyoneBut('not_mentor', {
        registered: 'hackathon_not_editable',
      }),
    }),
  },
};
