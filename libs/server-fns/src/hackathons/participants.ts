import { AppError, err, ok, type Result } from '@founders-coffee/core';
import {
  getHackathon,
  listHackathonParticipants,
  listHackathonTeams,
  type Db,
  type HackathonParticipant,
  type HackathonTeamListing,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { logger, reportError } from '@founders-coffee/observability';

import { hackathonNotFound } from './edit-context.js';
import { requireHackathonsEnabled } from './flag.js';

export type HackathonParticipantsView = {
  readonly questions: readonly hackathons.HackathonApplicationQuestion[];
  readonly participants: readonly (Omit<
    HackathonParticipant,
    'applicationAnswersJson'
  > & {
    readonly applicationAnswers: readonly hackathons.HackathonApplicationAnswer[];
  })[];
  readonly isTruncated: boolean;
};

/**
 * Who registered for a hackathon, for its organisers (B-REG-08). The middleware has checked that the
 * reader may manage it.
 */
export const hackathonParticipantsResolver = async (
  db: Db,
  eventId: string,
): Promise<Result<HackathonParticipantsView>> => {
  const found = await getHackathon(db, eventId);
  if (!found) return hackathonNotFound();
  const disabled = await requireHackathonsEnabled(db, found.event.marketCode);
  if (disabled) return err(disabled);
  const questions = applicationQuestionsOf(
    found.hackathon.applicationQuestionsJson,
    eventId,
  );
  if (!questions) return err(applicationUnavailable());
  const view = await listHackathonParticipants(db, eventId);
  return ok({
    questions: questions.filter((question) => question.scope === 'participant'),
    participants: view.participants.map(
      ({ applicationAnswersJson, ...participant }) => ({
        ...participant,
        applicationAnswers: applicationAnswersOf(
          applicationAnswersJson,
          questions,
          'participant',
          eventId,
        ),
      }),
    ),
    isTruncated: view.isTruncated,
  });
};

export type HackathonTeamsView = {
  readonly questions: readonly hackathons.HackathonApplicationQuestion[];
  readonly teams: readonly (Omit<
    HackathonTeamListing,
    'applicationAnswersJson'
  > & {
    readonly applicationAnswers: readonly hackathons.HackathonApplicationAnswer[];
  })[];
  readonly isTruncated: boolean;
};

/**
 * A hackathon's teams and how their entries stand, for its organisers (B-OPS-02). The middleware has
 * checked that the reader may manage it.
 */
export const hackathonTeamsResolver = async (
  db: Db,
  eventId: string,
): Promise<Result<HackathonTeamsView>> => {
  const found = await getHackathon(db, eventId);
  if (!found) return hackathonNotFound();
  const disabled = await requireHackathonsEnabled(db, found.event.marketCode);
  if (disabled) return err(disabled);
  const questions = applicationQuestionsOf(
    found.hackathon.applicationQuestionsJson,
    eventId,
  );
  if (!questions) return err(applicationUnavailable());
  const view = await listHackathonTeams(db, eventId);
  return ok({
    questions: questions.filter((question) => question.scope === 'team'),
    teams: view.teams.map(({ applicationAnswersJson, ...team }) => ({
      ...team,
      applicationAnswers: applicationAnswersOf(
        applicationAnswersJson,
        questions,
        'team',
        eventId,
      ),
    })),
    isTruncated: view.isTruncated,
  });
};

const applicationUnavailable = () =>
  new AppError('event_unavailable', 'The application form is unavailable');

const applicationQuestionsOf = (json: string, eventId: string) => {
  try {
    return hackathons.hackathonApplicationQuestionsSchema.parse(
      JSON.parse(json),
    );
  } catch (error) {
    logger.error('hackathon.application_questions_invalid', { eventId });
    reportError(error, {
      operation: 'hackathon_application_questions_invalid',
      eventId,
    });
    return null;
  }
};

const applicationAnswersOf = (
  json: string,
  questions: readonly hackathons.HackathonApplicationQuestion[],
  scope: hackathons.HackathonApplicationQuestionScope,
  eventId: string,
) => {
  try {
    const checked = hackathons.checkHackathonApplicationAnswers(
      questions,
      JSON.parse(json),
      scope,
    );
    if (checked.ok) return checked.answers;
    logger.error('hackathon.application_answers_invalid', {
      eventId,
      questionId: checked.questionId,
      scope,
    });
    return [];
  } catch (error) {
    logger.error('hackathon.application_answers_invalid', { eventId, scope });
    reportError(error, {
      operation: 'hackathon_application_answers_invalid',
      eventId,
      scope,
    });
    return [];
  }
};
