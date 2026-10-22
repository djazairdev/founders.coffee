import { appErrorCode } from '@founders-coffee/core';
import {
  hackathon_register_error_already,
  hackathon_register_error_closed,
  hackathon_register_error_failed,
  hackathon_register_error_mode,
  hackathon_register_error_rate_limited,
  hackathon_register_need_age,
  hackathon_withdraw_error_captain,
  hackathon_withdraw_error_closed,
  hackathons_unavailable,
  type Locale,
} from '@founders-coffee/i18n';

/** What a refused registration or withdrawal tells the member (B-REG-06). */
export const registrationErrorMessage = (
  error: unknown,
  locale: Locale,
): string => {
  const options = { locale };
  switch (appErrorCode(error)) {
    case 'registration_closed':
      return hackathon_register_error_closed({}, options);
    case 'attendance_mode_unavailable':
      return hackathon_register_error_mode({}, options);
    case 'not_eligible':
      return hackathon_register_need_age({}, options);
    case 'already_registered':
    case 'not_registered':
      return hackathon_register_error_already({}, options);
    case 'withdrawal_closed':
      return hackathon_withdraw_error_closed({}, options);
    case 'captain_must_transfer':
      return hackathon_withdraw_error_captain({}, options);
    case 'hackathons_disabled':
      return hackathons_unavailable({}, options);
    case 'rate_limited':
      return hackathon_register_error_rate_limited({}, options);
    default:
      return hackathon_register_error_failed({}, options);
  }
};
