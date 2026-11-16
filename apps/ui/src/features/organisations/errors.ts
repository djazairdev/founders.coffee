import { appErrorCode } from '@founders-coffee/core';
import {
  org_apply_error_description,
  org_apply_error_kind,
  org_apply_error_name,
  org_apply_error_website,
  type Locale,
} from '@founders-coffee/i18n';

import {
  DESCRIPTION_LENGTH,
  NAME_LENGTH,
  type ApplicationField,
} from './application';

export type ApplicationRefusal =
  | { readonly kind: 'hackathons_disabled' }
  | { readonly kind: 'rate_limited' }
  | { readonly kind: 'signed_out' }
  | { readonly kind: 'failed' };

/** Translate an application refusal into a form-wide message. */
export const applicationRefusal = (error: unknown): ApplicationRefusal => {
  switch (appErrorCode(error)) {
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

export type RosterRefusal =
  'already_member' | 'invalid_email' | 'rate_limited' | 'failed';

/** What a refused invitation, cancellation or removal means for the organisation page. */
export const rosterRefusal = (error: unknown): RosterRefusal => {
  switch (appErrorCode(error)) {
    case 'organisation_already_member':
      return 'already_member';
    case 'validation_failed':
      return 'invalid_email';
    case 'rate_limited':
      return 'rate_limited';
    default:
      return 'failed';
  }
};

/**
 * Whether the organisation page was refused because there is no such organisation for this member:
 * one they do not belong to, or an address that cannot be one.
 */
export const isOrganisationNotFound = (error: unknown): boolean => {
  const code = appErrorCode(error);
  return code === 'organisation_not_found' || code === 'validation_failed';
};

/** Whether the invitation page was refused because the invitation is not the reader's to see. */
export const isInvitationNotFound = (error: unknown): boolean => {
  const code = appErrorCode(error);
  return (
    code === 'organisation_invitation_not_found' || code === 'validation_failed'
  );
};

/** What an application field the form found unusable needs, or `null` for one that says nothing. */
export const applicationFieldError = (
  field: ApplicationField,
  locale: Locale,
): string | null => {
  switch (field) {
    case 'name':
      return org_apply_error_name(NAME_LENGTH, { locale });
    case 'kind':
      return org_apply_error_kind({}, { locale });
    case 'description':
      return org_apply_error_description(DESCRIPTION_LENGTH, { locale });
    case 'websiteUrl':
      return org_apply_error_website({}, { locale });
    default:
      return null;
  }
};
