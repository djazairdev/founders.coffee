import { appErrorCode } from '@founders-coffee/core';
import {
  hackathon_submission_captain_only,
  hackathon_submission_closed,
  hackathon_submission_error_conflict,
  hackathon_submission_error_failed,
  hackathon_submission_error_incomplete,
  hackathon_submission_error_not_started,
  hackathon_submission_error_track,
  hackathon_submission_locked,
  hackathon_team_error_rate_limited,
  type Locale,
} from '@founders-coffee/i18n';

/** What a refused save of the team's project tells the captain (B-SUB-05). */
export const submissionErrorMessage = (
  error: unknown,
  locale: Locale,
): string => {
  const options = { locale };
  switch (appErrorCode(error)) {
    case 'deadline_passed':
      return hackathon_submission_closed({}, options);
    case 'building_not_started':
      return hackathon_submission_error_not_started({}, options);
    case 'not_team_captain':
      return hackathon_submission_captain_only({}, options);
    case 'submission_conflict':
      return hackathon_submission_error_conflict({}, options);
    case 'submission_incomplete':
      return hackathon_submission_error_incomplete({}, options);
    case 'submission_locked':
      return hackathon_submission_locked({}, options);
    case 'track_not_in_hackathon':
      return hackathon_submission_error_track({}, options);
    case 'rate_limited':
      return hackathon_team_error_rate_limited({}, options);
    default:
      return hackathon_submission_error_failed({}, options);
  }
};
