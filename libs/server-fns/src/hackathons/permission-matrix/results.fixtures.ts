import { hackathons } from '@founders-coffee/domain';

import {
  decideReportResolver,
  listReportQueueResolver,
} from '../../admin/hackathon-reports.js';
import {
  decideHackathonReviewResolver,
  listHackathonReviewQueueResolver,
} from '../../admin/hackathon-review.js';
import {
  judgingProgressResolver,
  remindJudgesResolver,
} from '../judging-progress.js';
import {
  listPullRequestsResolver,
  setPullRequestStatusResolver,
} from '../pull-requests.js';
import { reportHackathonTargetResolver } from '../reports.js';
import {
  hackathonResultsResolver,
  publishHackathonResultsResolver,
} from '../results.js';
import {
  adminOnly,
  everyone,
  everyoneBut,
  inEveryPhase,
  may,
  ORGANISER,
  organiserOnly,
  type Operations,
} from './matrix.fixtures.js';
import {
  assignPrizeResolver,
  prizeDeliveryResolver,
  setPrizeDeliveryResolver,
} from '../prize-delivery.js';
import { PULL_REQUEST_URL } from './world.fixtures.js';

export const RESULTS_OPERATIONS: Operations = {
  getHackathonJudgingProgress: {
    gate: ORGANISER,
    run: ({ db, world }) => judgingProgressResolver(db, world.eventId),
    cells: organiserOnly('ok'),
  },
  remindHackathonJudges: {
    gate: ORGANISER,
    run: ({ db, world }) => remindJudgesResolver(db, world.eventId),
    cells: organiserOnly('judging_not_started', {
      judging: 'ok',
      judged: 'judging_closed',
      results: 'judging_closed',
      cancelled: 'judging_closed',
    }),
  },
  getHackathonPullRequests: {
    gate: ORGANISER,
    run: ({ db, world }) => listPullRequestsResolver(db, world.eventId),
    cells: organiserOnly('ok'),
  },
  setHackathonPullRequestStatus: {
    gate: ORGANISER,
    changesWorld: true,
    run: ({ db, world }) =>
      setPullRequestStatusResolver(db, {
        eventId: world.eventId,
        submissionId: world.submissionId,
        url: PULL_REQUEST_URL,
        status: 'reviewed',
      }),
    cells: organiserOnly('building_not_started', {
      building: 'submission_not_found',
      judging: 'ok',
      judged: 'ok',
      results: 'results_published',
      cancelled: 'hackathon_not_editable',
    }),
  },
  getHackathonResults: {
    gate: ORGANISER,
    run: ({ db, world }) => hackathonResultsResolver(db, world.eventId),
    cells: organiserOnly('ok'),
  },
  publishHackathonResults: {
    gate: ORGANISER,
    changesWorld: true,
    run: ({ db, world, userId }) =>
      publishHackathonResultsResolver(db, null, {
        ...hackathons.publishResultsSchema.parse({ eventId: world.eventId }),
        actorUserId: userId,
      }),
    cells: organiserOnly('judging_not_ended', {
      draft: 'hackathon_not_editable',
      review: 'hackathon_not_editable',
      judged: 'ok',
      results: 'results_already_published',
      cancelled: 'hackathon_not_editable',
    }),
  },
  getHackathonPrizeDelivery: {
    gate: ORGANISER,
    run: ({ db, world }) => prizeDeliveryResolver(db, world.eventId),
    cells: organiserOnly('ok'),
  },
  assignHackathonPrize: {
    gate: ORGANISER,
    changesWorld: true,
    run: ({ db, world }) =>
      assignPrizeResolver(db, {
        eventId: world.eventId,
        prizeId: world.prizeId,
        submissionId: world.submissionId,
      }),
    cells: organiserOnly('results_not_published', {
      results: 'hackathon_prize_not_found',
      cancelled: 'hackathon_not_editable',
    }),
  },
  setHackathonPrizeDelivery: {
    gate: ORGANISER,
    changesWorld: true,
    run: ({ db, world }) =>
      setPrizeDeliveryResolver(db, {
        eventId: world.eventId,
        prizeId: world.prizeId,
        status: 'sent',
        note: null,
      }),
    cells: organiserOnly('results_not_published', {
      results: 'prize_not_awarded',
      cancelled: 'hackathon_not_editable',
    }),
  },
  reportHackathonTarget: {
    gate: may('hackathon_report', 'create'),
    run: ({ db, world, userId }) =>
      reportHackathonTargetResolver(db, {
        eventId: world.eventId,
        targetType: 'team',
        targetId: world.teamId,
        reason: 'plagiarism',
        reporterId: userId,
      }),
    cells: inEveryPhase(
      everyoneBut('ok', {
        captain: 'own_team_report',
        member: 'own_team_report',
      }),
      {
        draft: everyone('report_target_not_found'),
        review: everyone('report_target_not_found'),
        cancelled: everyone('report_target_not_found'),
      },
    ),
  },
  listHackathonReportQueue: {
    gate: may('moderation', 'submission'),
    run: ({ db }) => listReportQueueResolver(db, 0),
    cells: adminOnly('ok'),
  },
  decideHackathonReport: {
    gate: may('moderation', 'submission'),
    changesWorld: true,
    needs: 'report',
    run: ({ db, world, userId }) =>
      decideReportResolver(db, {
        decision: {
          targetType: 'team',
          targetId: world.teamId,
          decision: 'dismiss',
        },
        actorUserId: userId,
        accessSubject: null,
      }),
    cells: adminOnly('ok', {
      draft: 'report_not_found',
      review: 'report_not_found',
    }),
  },
  listHackathonReviewQueue: {
    gate: may('moderation', 'hackathon'),
    run: ({ db }) => listHackathonReviewQueueResolver(db, 0),
    cells: adminOnly('ok'),
  },
  decideHackathonReviewDecision: {
    gate: may('moderation', 'hackathon'),
    changesWorld: true,
    run: ({ db, world, userId }) =>
      decideHackathonReviewResolver(db, () => Promise.resolve(), null, {
        decision: hackathons.hackathonReviewDecisionSchema.parse({
          eventId: world.eventId,
          version: world.version,
          decision: 'approve',
        }),
        actorUserId: userId,
        accessSubject: null,
      }),
    cells: adminOnly('invalid_hackathon_transition', {
      draft: 'ok',
      review: 'ok',
    }),
  },
};
