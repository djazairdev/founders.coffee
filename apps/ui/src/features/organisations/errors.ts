import { appErrorCode } from '@founders-coffee/core';

import type { ApplicationField } from './application';

export type ApplicationRefusal =
  | { readonly kind: 'field'; readonly field: ApplicationField }
  | { readonly kind: 'slug_taken' }
  | { readonly kind: 'hackathons_disabled' }
  | { readonly kind: 'rate_limited' }
  | { readonly kind: 'signed_out' }
  | { readonly kind: 'failed' };

/**
 * What a refused application means for the form. A taken address and a city the market does not
 * have send the applicant back to that field; a market with hackathons off is not an error but a
 * state, shown as such.
 */
export const applicationRefusal = (error: unknown): ApplicationRefusal => {
  switch (appErrorCode(error)) {
    case 'organisation_slug_taken':
      return { kind: 'slug_taken' };
    case 'validation_failed':
      return { kind: 'field', field: 'cityCode' };
    case 'hackathons_disabled':
      return { kind: 'hackathons_disabled' };
    case 'rate_limited':
      return { kind: 'rate_limited' };
    case 'unauthenticated':
      return { kind: 'signed_out' };
    default:
      return { kind: 'failed' };
  }
};
