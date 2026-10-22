import { appErrorCode } from '@founders-coffee/core';
import {
  hackathon_team_error_changed,
  hackathon_team_error_failed,
  hackathon_team_error_full,
  hackathon_team_error_in_team,
  hackathon_team_error_invite_invalid,
  hackathon_team_error_locked,
  hackathon_team_error_name_taken,
  hackathon_team_error_not_registered,
  hackathon_team_error_rate_limited,
  type Locale,
} from '@founders-coffee/i18n';

/**
 * What a refused team change tells the member (B-TEAM-07). A refusal that only means the team
 * moved on in between, such as a request already answered or a captain who changed, says so: the
 * page is read again after every change, so it already shows where things stand.
 */
export const teamErrorMessage = (error: unknown, locale: Locale): string => {
  const options = { locale };
  switch (appErrorCode(error)) {
    case 'teams_locked':
      return hackathon_team_error_locked({}, options);
    case 'not_registered':
      return hackathon_team_error_not_registered({}, options);
    case 'already_in_team':
      return hackathon_team_error_in_team({}, options);
    case 'team_full':
      return hackathon_team_error_full({}, options);
    case 'team_name_taken':
      return hackathon_team_error_name_taken({}, options);
    case 'team_invite_invalid':
      return hackathon_team_error_invite_invalid({}, options);
    case 'not_team_captain':
    case 'not_team_member':
    case 'team_not_found':
    case 'team_request_not_found':
    case 'team_request_exists':
    case 'captain_must_transfer':
      return hackathon_team_error_changed({}, options);
    case 'rate_limited':
      return hackathon_team_error_rate_limited({}, options);
    default:
      return hackathon_team_error_failed({}, options);
  }
};
