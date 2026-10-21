import { z } from 'zod';

export const ORGANISATION_KINDS = [
  'club',
  'university',
  'community',
  'company',
  'platform',
] as const;
export type OrganisationKind = (typeof ORGANISATION_KINDS)[number];
export const organisationKindSchema = z.enum(ORGANISATION_KINDS);

export const organisationIdSchema = z.string().trim().min(1).max(128);

export const ORGANISATION_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'suspended',
] as const;
export type OrganisationStatus = (typeof ORGANISATION_STATUSES)[number];
export const organisationStatusSchema = z.enum(ORGANISATION_STATUSES);

export const ORGANISATION_INVITATION_STATUSES = [
  'pending',
  'accepted',
  'rejected',
  'canceled',
] as const;
export type OrganisationInvitationStatus =
  (typeof ORGANISATION_INVITATION_STATUSES)[number];
