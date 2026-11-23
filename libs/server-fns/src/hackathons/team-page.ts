import {
  AppError,
  ok,
  err,
  type HackathonRegistrationStatus,
  type Result,
} from '@founders-coffee/core';
import {
  listOwnCertificates,
  listOwnTeamRequests,
  listTeamPrizes,
  readHackathonRecordOffer,
  readParticipantStanding,
  readTeamFeedback,
  readTeamEntryProject,
  readTeamPageTeam,
  type Db,
  type TeamPageMember,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { logger, reportError } from '@founders-coffee/observability';

import {
  teamProjectViewOf,
  type TeamProjectView,
} from '../projects/from-entry.js';
import type { OwnCertificate } from './certificate-page.js';
import { loadTeamHackathon } from './team-context.js';

export type TeamPageView = {
  readonly event: {
    readonly id: string;
    readonly title: string;
    readonly slug: string;
    readonly marketCode: string;
  };
  readonly submissionDeadlineAt: number;
  readonly canChangeTeams: boolean;
  readonly canStillRegister: boolean;
  readonly teamMin: number;
  readonly teamMax: number;
  readonly teamQuestions: readonly hackathons.HackathonApplicationQuestion[];
  readonly viewerId: string;
  readonly registration: HackathonRegistrationStatus | null;
  readonly team: {
    readonly id: string;
    readonly name: string;
    readonly description: string | null;
    readonly isLookingForMembers: boolean;
    readonly applicationAnswers: readonly hackathons.HackathonApplicationAnswer[];
    readonly isCaptain: boolean;
    readonly members: readonly TeamPageMember[];
    readonly requests: readonly {
      readonly id: string;
      readonly userId: string;
      readonly name: string | null;
      readonly createdAt: number;
    }[];
    readonly inviteExpiresAt: number | null;
  } | null;
  readonly ownRequests: readonly {
    readonly id: string;
    readonly teamId: string;
    readonly teamName: string;
    readonly createdAt: number;
  }[];
  readonly feedback: hackathons.TeamFeedback | null;
  readonly project: TeamProjectView | null;
  readonly recordOffer: { readonly isShown: boolean } | null;
  readonly certificates: readonly OwnCertificate[];
  readonly prizes: readonly {
    readonly prizeId: string;
    readonly title: string;
    readonly isDelivered: boolean;
  }[];
};

/**
 * A member's team page for a published hackathon (B-TEAM-07): where they stand in it, the team
 * they are in with its members, and whether teams can still change, decided here from the
 * hackathon's dates. Only the captain is given the requests waiting for an answer and when the
 * team's invite link stops working; a member in no team is given their own requests instead. Once
 * the results are published, a member also reads the judges' feedback on their own team's entry
 * and where the project made from it stands (B-JDG-12, B-PRJ-02): the team comes from the reader's
 * own membership, so nobody can ask for another's.
 */
export const teamPageResolver = async (
  db: Db,
  input: { readonly eventId: string; readonly userId: string },
  now: number = Date.now(),
): Promise<Result<TeamPageView>> => {
  const loaded = await loadTeamHackathon(db, input.eventId);
  if (!loaded.ok) return loaded;
  const { event, timeline, teamMin, teamMax, resultsPublishedAt } = loaded.data;
  let questions: readonly hackathons.HackathonApplicationQuestion[];
  try {
    questions = hackathons.hackathonApplicationQuestionsSchema.parse(
      JSON.parse(loaded.data.applicationQuestionsJson),
    );
  } catch (error) {
    logger.error('hackathon.application_questions_invalid', {
      eventId: input.eventId,
    });
    reportError(error, {
      operation: 'hackathon_application_questions_invalid',
      eventId: input.eventId,
    });
    return err(
      new AppError('event_unavailable', 'The application form is unavailable'),
    );
  }
  const standing = await readParticipantStanding(db, input);
  const membership = standing.membership;
  const results =
    membership && resultsPublishedAt
      ? { eventId: input.eventId, teamId: membership.teamId }
      : null;
  const [
    team,
    ownRequests,
    feedback,
    entry,
    recordOffer,
    prizes,
    certificates,
  ] = await Promise.all([
    membership ? readTeamPageTeam(db, membership.teamId, new Date(now)) : null,
    membership ? [] : listOwnTeamRequests(db, input),
    results ? readTeamFeedback(db, results) : null,
    results ? readTeamEntryProject(db, results) : null,
    resultsPublishedAt ? readHackathonRecordOffer(db, input) : null,
    results ? listTeamPrizes(db, results) : [],
    resultsPublishedAt ? listOwnCertificates(db, input) : [],
  ]);
  const isCaptain = membership?.isCaptain ?? false;
  let teamAnswers: readonly hackathons.HackathonApplicationAnswer[] = [];
  if (team) {
    try {
      const checked = hackathons.checkHackathonApplicationAnswers(
        questions,
        JSON.parse(team.applicationAnswersJson),
        'team',
      );
      if (!checked.ok)
        throw new AppError(
          'event_unavailable',
          'The team answers are unavailable',
        );
      teamAnswers = checked.answers;
    } catch (error) {
      logger.error('hackathon.application_answers_invalid', {
        eventId: input.eventId,
        scope: 'team',
      });
      reportError(error, {
        operation: 'hackathon_application_answers_invalid',
        eventId: input.eventId,
        scope: 'team',
      });
      return err(
        new AppError('event_unavailable', 'The team answers are unavailable'),
      );
    }
  }
  return ok({
    event: {
      id: event.id,
      title: event.title,
      slug: event.slug,
      marketCode: event.marketCode,
    },
    submissionDeadlineAt: timeline.submissionDeadlineAt,
    canChangeTeams: hackathons.canChangeTeams(timeline, now),
    canStillRegister: ['upcoming', 'registration_open'].includes(
      hackathons.phaseAt(timeline, now),
    ),
    teamMin,
    teamMax,
    teamQuestions: questions.filter((question) => question.scope === 'team'),
    viewerId: input.userId,
    registration: standing.status,
    team: team && {
      id: team.id,
      name: team.name,
      description: team.description,
      isLookingForMembers: team.isLookingForMembers,
      applicationAnswers: teamAnswers,
      isCaptain,
      members: team.members,
      requests: isCaptain
        ? team.requests.map((request) => ({
            ...request,
            createdAt: request.createdAt.getTime(),
          }))
        : [],
      inviteExpiresAt: isCaptain
        ? (team.inviteExpiresAt?.getTime() ?? null)
        : null,
    },
    ownRequests: ownRequests.map((request) => ({
      ...request,
      createdAt: request.createdAt.getTime(),
    })),
    feedback:
      feedback &&
      hackathons.teamFeedbackOf(
        feedback.title,
        feedback.criteria,
        feedback.scores,
      ),
    project: teamProjectViewOf(entry, {
      userId: input.userId,
      isCaptain,
    }),
    recordOffer,
    certificates,
    prizes: prizes.map(({ prizeId, title, status }) => ({
      prizeId,
      title,
      isDelivered: status === 'received',
    })),
  });
};
