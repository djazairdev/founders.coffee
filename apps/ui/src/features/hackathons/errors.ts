import { appErrorCode, type HackathonErrorCode } from '@founders-coffee/core';

const HACKATHONS_DISABLED: HackathonErrorCode = 'hackathons_disabled';

/**
 * Whether a failed hackathon query or mutation was refused because the market has hackathons off.
 *
 * A screen shows `HackathonsUnavailable` for this refusal instead of a generic error: nothing went
 * wrong, the feature is simply not open in that country yet.
 */
export const isHackathonsDisabled = (error: unknown): boolean =>
  appErrorCode(error) === HACKATHONS_DISABLED;
