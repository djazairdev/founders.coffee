import { hackathons } from '@founders-coffee/domain';

import { testMapProvider } from '../../events/resolver.fixtures.js';
import { hackathonDashboardResolver } from '../dashboard.js';
import { deleteHackathonResolver } from '../deletion.js';
import {
  hackathonParticipantsResolver,
  hackathonTeamsResolver,
} from '../participants.js';
import {
  saveHackathonDeadlinesResolver,
  saveHackathonSettingsResolver,
} from '../details.js';
import { saveHackathonApplicationQuestionsResolver } from '../application-questions.js';
import { hackathonDraftResolver } from '../draft-view.js';
import { createHackathonDraftResolver } from '../draft.js';
import { criterion, founderTrack, prize } from '../edit.fixtures.js';
import {
  addHackathonPrizeResolver,
  changeHackathonPrizeResolver,
  confirmHackathonPrizeResolver,
  removeHackathonPrizeResolver,
} from '../prizes.js';
import { saveHackathonRubricResolver } from '../rubric.js';
import { saveHackathonTracksResolver } from '../tracks.js';
import {
  everyoneBut,
  inEveryPhase,
  ORGANISER,
  organiserOnly,
  type Call,
  type Operations,
  type Phase,
} from './matrix.fixtures.js';

const NOT_EDITABLE = 'hackathon_not_editable';
const LOCKED = 'hackathon_field_locked';

const NEVER_EDITABLE: Partial<Record<Phase, string>> = {
  review: NOT_EDITABLE,
  judged: NOT_EDITABLE,
  results: NOT_EDITABLE,
  cancelled: NOT_EDITABLE,
};

const FROZEN_ONCE_OPEN: Partial<Record<Phase, string>> = {
  ...NEVER_EDITABLE,
  open: LOCKED,
  building: LOCKED,
  judging: LOCKED,
};

const editOf = ({ world }: Call) => ({
  eventId: world.eventId,
  version: world.version,
  organisationId: world.organisationId,
});

const WEIGHTS = [
  ['Impact', 40],
  ['Craft', 30],
  ['Demo', 30],
] as const;

export const ORGANISER_OPERATIONS: Operations = {
  createHackathonDraft: {
    gate: { kind: 'organisation', resource: 'hackathon', action: 'create' },
    run: ({ db, world, userId }) =>
      createHackathonDraftResolver(db, testMapProvider, {
        hostId: userId,
        organisationId: world.organisationId,
        basics: hackathons.hackathonBasicsSchema.parse({
          marketCode: 'DZ',
          cityCode: '1',
          title: 'Another Builders Hackathon',
          description:
            'Two more days of building with founders across Algiers.',
          format: 'online',
          meetingUrl: 'https://meet.example.com/builders',
          startsAt: Date.now() + 30 * 86_400_000,
          endsAt: Date.now() + 32 * 86_400_000,
          languages: ['ar', 'fr'],
          hackathonFields: ['software_development'],
          hackathonTypeTags: ['open_source'],
        }),
      }),
    cells: inEveryPhase(everyoneBut('forbidden', { organiser: 'ok' })),
  },
  getHackathonDraft: {
    gate: ORGANISER,
    run: ({ db, world }) => hackathonDraftResolver(db, world.eventId),
    cells: organiserOnly('ok'),
  },
  getHackathonDashboard: {
    gate: ORGANISER,
    run: ({ db, world }) => hackathonDashboardResolver(db, world.eventId),
    cells: organiserOnly('ok'),
  },
  getHackathonParticipants: {
    gate: ORGANISER,
    run: ({ db, world }) => hackathonParticipantsResolver(db, world.eventId),
    cells: organiserOnly('ok'),
  },
  getHackathonTeams: {
    gate: ORGANISER,
    run: ({ db, world }) => hackathonTeamsResolver(db, world.eventId),
    cells: organiserOnly('ok'),
  },
  deleteOwnedHackathon: {
    gate: ORGANISER,
    changesWorld: true,
    run: ({ db, world, userId }) =>
      deleteHackathonResolver(db, {
        eventId: world.eventId,
        organisationId: world.organisationId,
        actorUserId: userId,
        accessSubject: null,
      }),
    cells: organiserOnly('ok'),
  },
  saveHackathonDeadlines: {
    gate: ORGANISER,
    changesWorld: true,
    run: (call) =>
      saveHackathonDeadlinesResolver(call.db, {
        ...editOf(call),
        deadlines: {
          registrationOpensAt: call.world.details.registrationOpensAt,
          registrationClosesAt: call.world.details.registrationClosesAt,
          submissionDeadlineAt: call.world.details.submissionDeadlineAt,
          judgingEndsAt: call.world.details.judgingEndsAt,
        },
      }),
    cells: organiserOnly('ok', NEVER_EDITABLE),
  },
  saveHackathonSettings: {
    gate: ORGANISER,
    changesWorld: true,
    run: (call) =>
      saveHackathonSettingsResolver(call.db, {
        ...editOf(call),
        settings: {
          attendanceModes: call.world.details.attendanceModes,
          teamMin: call.world.details.teamMin,
          teamMax: call.world.details.teamMax,
          capacity: call.world.details.capacity,
          minimumAge: call.world.details.minimumAge,
          rules: call.world.details.rules,
          aiPolicy: call.world.details.aiPolicy,
          aiPolicyNote: call.world.details.aiPolicyNote,
          licenceNote: call.world.details.licenceNote,
        },
      }),
    cells: organiserOnly('ok', NEVER_EDITABLE),
  },
  saveHackathonTracks: {
    gate: ORGANISER,
    changesWorld: true,
    run: (call) =>
      saveHackathonTracksResolver(call.db, {
        ...editOf(call),
        tracks: [
          {
            id: call.world.trackId,
            track: founderTrack('Payments for cafés'),
          },
        ],
      }),
    cells: organiserOnly('ok', NEVER_EDITABLE),
  },
  saveHackathonApplicationQuestions: {
    gate: ORGANISER,
    changesWorld: true,
    run: (call) =>
      saveHackathonApplicationQuestionsResolver(call.db, {
        ...editOf(call),
        questions: [],
      }),
    cells: organiserOnly('ok', {
      review: NOT_EDITABLE,
      open: LOCKED,
      building: LOCKED,
      judging: LOCKED,
      judged: NOT_EDITABLE,
      results: NOT_EDITABLE,
      cancelled: NOT_EDITABLE,
    }),
  },
  saveHackathonRubric: {
    gate: ORGANISER,
    changesWorld: true,
    run: (call) =>
      saveHackathonRubricResolver(call.db, {
        ...editOf(call),
        criteria: WEIGHTS.map(([name, weight], index) => ({
          id: call.world.criterionIds[index] ?? null,
          criterion: criterion(name, weight),
        })),
      }),
    cells: organiserOnly('ok', FROZEN_ONCE_OPEN),
  },
  addHackathonPrize: {
    gate: ORGANISER,
    changesWorld: true,
    run: (call) =>
      addHackathonPrizeResolver(call.db, {
        ...editOf(call),
        prize: prize({ place: 2, title: 'Second prize' }),
      }),
    cells: organiserOnly('ok', NEVER_EDITABLE),
  },
  changeHackathonPrize: {
    gate: ORGANISER,
    changesWorld: true,
    run: (call) =>
      changeHackathonPrizeResolver(call.db, {
        ...editOf(call),
        prizeId: call.world.prizeId,
        prize: prize({ title: 'The first prize' }),
      }),
    cells: organiserOnly('ok', FROZEN_ONCE_OPEN),
  },
  removeHackathonPrize: {
    gate: ORGANISER,
    changesWorld: true,
    run: (call) =>
      removeHackathonPrizeResolver(call.db, {
        ...editOf(call),
        prizeId: call.world.prizeId,
      }),
    cells: organiserOnly('ok', FROZEN_ONCE_OPEN),
  },
  confirmHackathonPrize: {
    gate: ORGANISER,
    changesWorld: true,
    run: (call) =>
      confirmHackathonPrizeResolver(call.db, {
        ...editOf(call),
        prizeId: call.world.prizeId,
        note: 'Confirmed by email with the sponsor.',
      }),
    cells: organiserOnly('ok', NEVER_EDITABLE),
  },
};
