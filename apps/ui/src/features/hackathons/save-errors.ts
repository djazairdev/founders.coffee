import { appErrorCode } from '@founders-coffee/core';
import {
  hackathon_create_forbidden,
  hackathon_error_paused,
  hackathon_error_rate_limited,
  hackathon_error_save,
  hackathon_error_signed_out,
  hackathons_unavailable,
  host_error_invalid,
  host_map_error,
  host_venue_unsupported,
  type Locale,
} from '@founders-coffee/i18n';

type SaveErrorMessage = (
  inputs?: Record<string, never>,
  options?: { locale?: Locale },
) => string;

const SAVE_ERROR_MESSAGES: Record<string, SaveErrorMessage> = {
  unauthenticated: hackathon_error_signed_out,
  forbidden: hackathon_create_forbidden,
  organisation_not_approved: hackathon_create_forbidden,
  rate_limited: hackathon_error_rate_limited,
  validation_failed: host_error_invalid,
  hackathons_disabled: hackathons_unavailable,
  event_market_unavailable: hackathons_unavailable,
  event_creation_disabled: hackathon_error_paused,
  map_venue_not_found: host_venue_unsupported,
  map_city_not_found: host_map_error,
  map_provider_unavailable: host_map_error,
};

/**
 * The message for a draft the server would not save, naming what the organiser can do about it.
 *
 * Nothing they entered is lost: the wizard keeps every field, so the message only has to say
 * whether to wait, sign in again, or change something. A code this list does not know falls back
 * to the plain retry message rather than to nothing.
 */
export const hackathonSaveError = (error: unknown, locale: Locale): string =>
  (SAVE_ERROR_MESSAGES[appErrorCode(error)] ?? hackathon_error_save)(
    {},
    { locale },
  );
