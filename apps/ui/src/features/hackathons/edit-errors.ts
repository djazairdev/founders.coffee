import { appErrorCode } from '@founders-coffee/core';
import {
  hackathon_details_error_conflict,
  hackathon_details_error_locked,
  hackathon_details_error_rate_limited,
  hackathon_details_error_save,
  hackathon_edit_error_details_required,
  hackathon_manage_locked,
  hackathon_tracks_error_has_prizes,
  host_error_invalid,
  type Locale,
} from '@founders-coffee/i18n';

/**
 * What an organiser reads when a hackathon edit is refused (B-HKN-07), by the refusal's code. A
 * section whose own lock reads differently from the details' passes it as `lockedMessage`.
 */
export const hackathonEditError = (
  error: unknown,
  locale: Locale,
  lockedMessage?: string,
): string => {
  const options = { locale };
  switch (appErrorCode(error)) {
    case 'rate_limited':
      return hackathon_details_error_rate_limited({}, options);
    case 'hackathon_not_editable':
      return hackathon_manage_locked({}, options);
    case 'hackathon_conflict':
      return hackathon_details_error_conflict({}, options);
    case 'hackathon_field_locked':
      return lockedMessage ?? hackathon_details_error_locked({}, options);
    case 'hackathon_details_required':
      return hackathon_edit_error_details_required({}, options);
    case 'hackathon_track_has_prizes':
      return hackathon_tracks_error_has_prizes({}, options);
    case 'validation_failed':
    case 'track_not_in_hackathon':
      return host_error_invalid({}, options);
    default:
      return hackathon_details_error_save({}, options);
  }
};
