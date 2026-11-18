import { appErrorCode } from '@founders-coffee/core';
import {
  hackathon_screenshot_error_failed,
  hackathon_screenshot_error_limit,
  hackathon_screenshot_error_large,
  hackathon_screenshot_error_small,
  hackathon_screenshot_error_type,
  type Locale,
} from '@founders-coffee/i18n';

import { submissionErrorMessage } from './submission-errors';

/** What to tell the captain when a screenshot could not be added or removed. */
export const screenshotErrorMessage = (
  error: unknown,
  locale: Locale,
): string => {
  const options = { locale };
  switch (appErrorCode(error)) {
    case 'photo_too_large':
      return hackathon_screenshot_error_large({}, options);
    case 'photo_too_small':
      return hackathon_screenshot_error_small({}, options);
    case 'photo_unsupported':
      return hackathon_screenshot_error_type({}, options);
    case 'screenshot_limit_reached':
      return hackathon_screenshot_error_limit({}, options);
    case 'photo_reservation_expired':
    case 'photo_reservation_used':
    case 'photo_storage_unavailable':
    case 'not_found':
      return hackathon_screenshot_error_failed({}, options);
    default:
      return submissionErrorMessage(error, locale);
  }
};
