import { z } from 'zod';

import {
  marketCodeSchema,
  organisationKindSchema,
} from '@founders-coffee/core';

import { professionalLinkSchema } from '../profile/schemas.js';

export const ORGANISATION_NAME_MIN_LENGTH = 2;
export const ORGANISATION_NAME_MAX_LENGTH = 80;
export const ORGANISATION_DESCRIPTION_MIN_LENGTH = 20;
export const ORGANISATION_DESCRIPTION_MAX_LENGTH = 1000;
export const ORGANISATION_SLUG_MIN_LENGTH = 3;
export const ORGANISATION_SLUG_MAX_LENGTH = 40;

export const RESERVED_ORGANISATION_SLUGS = [
  'admin',
  'api',
  'apply',
  'edit',
  'founders-coffee',
  'invitations',
  'manage',
  'new',
  'settings',
] as const;

const SLUG_SHAPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

/**
 * Whether a slug is one the platform keeps for itself.
 *
 * A slug is the address of an organisation's public page and is fixed once chosen, so the words
 * that name pages beside it (`new`, `manage`, `invitations`) or the platform itself are refused
 * up front rather than discovered as a clash later.
 */
export const isReservedOrganisationSlug = (slug: string): boolean =>
  (RESERVED_ORGANISATION_SLUGS as readonly string[]).includes(slug);

export const organisationSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(ORGANISATION_SLUG_MIN_LENGTH)
  .max(ORGANISATION_SLUG_MAX_LENGTH)
  .regex(
    SLUG_SHAPE,
    'Use lowercase letters and digits, joined by single hyphens',
  )
  .refine(
    (slug) => !isReservedOrganisationSlug(slug),
    'This address is reserved',
  );

export const organisationNameSchema = z
  .string()
  .trim()
  .min(ORGANISATION_NAME_MIN_LENGTH)
  .max(ORGANISATION_NAME_MAX_LENGTH);

export const organisationDescriptionSchema = z
  .string()
  .trim()
  .min(ORGANISATION_DESCRIPTION_MIN_LENGTH)
  .max(ORGANISATION_DESCRIPTION_MAX_LENGTH);

const cityCodeSchema = z.string().trim().min(1).max(32);

export const applicantOrganisationKindSchema = organisationKindSchema.exclude([
  'platform',
]);

export const organisationApplicationSchema = z.strictObject({
  name: organisationNameSchema,
  slug: organisationSlugSchema,
  kind: applicantOrganisationKindSchema,
  marketCode: marketCodeSchema,
  cityCode: cityCodeSchema.nullable().default(null),
  description: organisationDescriptionSchema,
  websiteUrl: professionalLinkSchema.default(null),
});

export const organisationEditSchema = z
  .strictObject({
    name: organisationNameSchema,
    cityCode: cityCodeSchema.nullable(),
    description: organisationDescriptionSchema,
    websiteUrl: professionalLinkSchema,
  })
  .partial()
  .refine(
    (changes) => Object.keys(changes).length > 0,
    'Change at least one field',
  );

export const INVITABLE_ORGANISATION_ROLES = ['admin', 'member'] as const;

export const organisationInvitationSchema = z.strictObject({
  email: z.string().trim().toLowerCase().email().max(254),
  role: z.enum(INVITABLE_ORGANISATION_ROLES),
});

export type OrganisationApplication = z.infer<
  typeof organisationApplicationSchema
>;
export type OrganisationEdit = z.infer<typeof organisationEditSchema>;
export type OrganisationInvitationInput = z.infer<
  typeof organisationInvitationSchema
>;
