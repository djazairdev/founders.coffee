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

const MISSING = new Set(['event_not_found', 'forbidden', 'validation_failed']);

/**
 * Whether a hackathon screen was refused because there is no hackathon this reader organises at
 * that address. Not organising it answers the same as it not existing, so the page cannot be used
 * to find out which drafts exist.
 */
export const isHackathonMissing = (error: unknown): boolean =>
  MISSING.has(appErrorCode(error));
