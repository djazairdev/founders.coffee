import { z } from 'zod';

import {
  idSchema,
  PROFILE_STAGES,
  profileLinkKindSchema,
  profileOpenToSchema,
  profileSkillSchema,
  profileStageSchema,
  topicSchema,
  TOPICS,
  userIdSchema,
  type ProfileLinkKind,
} from '@founders-coffee/core';

export { PROFILE_STAGES, profileStageSchema };
export type { ProfileStage } from '@founders-coffee/core';

export const SPOKEN_LANGUAGES = ['ar', 'fr', 'en', 'es', 'de', 'ber'] as const;
export const spokenLanguageSchema = z.enum(SPOKEN_LANGUAGES);
export type SpokenLanguage = z.infer<typeof spokenLanguageSchema>;
export const PROFILE_INTERESTS = TOPICS;
export const profileInterestSchema = topicSchema;
export type ProfileInterest = z.infer<typeof profileInterestSchema>;

export const profileIdentitySchema = userIdSchema;
export const profileRevisionSchema = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER - 1);
export const displayNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .refine((value) => Array.from(value).length <= 80, 'Name is too long');
export const introductionSchema = z
  .string()
  .trim()
  .max(600)
  .refine(
    (value) => Array.from(value).length <= 300,
    'Introduction is too long',
  )
  .nullable()
  .transform((value) => value || null);
export const headlineSchema = z
  .string()
  .trim()
  .max(160)
  .refine((value) => Array.from(value).length <= 80, 'Headline is too long')
  .nullable()
  .transform((value) => value || null);
export const memberSinceSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use a year and a month');

/** Reduce when an account was created to its month in UTC, so no day ever reaches a profile. */
export const memberSinceOf = (createdAt: Date): string =>
  createdAt.toISOString().slice(0, 7);

/** Whether `value` is an absolute HTTPS address that carries no user name or password. */
export const isCredentialFreeHttpsUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
};

export const professionalLinkSchema = z
  .string()
  .trim()
  .max(2048)
  .nullable()
  .transform((value) => value || null)
  .refine(
    (value) => value === null || isCredentialFreeHttpsUrl(value),
    'A credential-free HTTPS URL is required',
  );

export const PROFILE_SKILL_LIMIT = 10;
export const PROFILE_LINK_LIMIT = 3;

const isUnique = <T>(values: readonly T[]): boolean =>
  new Set(values).size === values.length;

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
};

/**
 * Which kind of link an address is, from its host alone.
 *
 * GitHub is `github.com` or `www.github.com`; LinkedIn is `linkedin.com` or any of its subdomains
 * (`www.`, `dz.`); anything else is a website. Storage keeps only the addresses and the profile
 * projection derives each kind with this, so a link's kind cannot disagree with its address.
 */
export const linkKindOf = (url: string): ProfileLinkKind => {
  const host = hostOf(url);
  if (host === 'github.com' || host === 'www.github.com') return 'github';
  if (host === 'linkedin.com' || host.endsWith('.linkedin.com'))
    return 'linkedin';
  return 'website';
};

export const profileLinkSchema = z
  .strictObject({
    kind: profileLinkKindSchema,
    url: z
      .string()
      .trim()
      .max(2048)
      .refine(
        isCredentialFreeHttpsUrl,
        'A credential-free HTTPS URL is required',
      ),
  })
  .refine(
    (link) =>
      !isCredentialFreeHttpsUrl(link.url) || linkKindOf(link.url) === link.kind,
    { path: ['url'], message: 'The address is not one of this kind' },
  );

export type ProfileLink = z.infer<typeof profileLinkSchema>;

export const profileSkillsSchema = z
  .array(profileSkillSchema)
  .max(PROFILE_SKILL_LIMIT)
  .refine(isUnique, 'Skills must be unique');

export const profileLinksSchema = z
  .array(profileLinkSchema)
  .max(PROFILE_LINK_LIMIT)
  .refine(
    (links) => isUnique(links.map((link) => link.kind)),
    'One link of each kind',
  );

export const profileOpenToListSchema = z
  .array(profileOpenToSchema)
  .refine(isUnique, 'Each choice once');

export const profileVisibilitySchema = z.strictObject({
  headline: z.boolean().default(false),
  stage: z.boolean().default(false),
  interests: z.boolean().default(false),
  spokenLanguages: z.boolean().default(false),
  skills: z.boolean().default(false),
  links: z.boolean().default(false),
  openTo: z.boolean().default(false),
  attendedCount: z.boolean().default(false),
});

export const profileDetailsSchema = z.strictObject({
  headline: headlineSchema.default(null),
  stage: profileStageSchema.nullable().default(null),
  introduction: introductionSchema.default(null),
  interests: z
    .array(profileInterestSchema)
    .max(5)
    .refine(
      (values) => new Set(values).size === values.length,
      'Interests must be unique',
    )
    .default([]),
  spokenLanguages: z
    .array(spokenLanguageSchema)
    .max(6)
    .refine(
      (values) => new Set(values).size === values.length,
      'Languages must be unique',
    )
    .default([]),
  skills: profileSkillsSchema.default([]),
  links: profileLinksSchema.default([]),
  openTo: profileOpenToListSchema.default([]),
  visibility: profileVisibilitySchema.default(() =>
    profileVisibilitySchema.parse({}),
  ),
});

const normalizeProfile = <T extends z.infer<typeof profileDetailsSchema>>(
  details: T,
): T => ({
  ...details,
  visibility: {
    ...details.visibility,
    headline: details.visibility.headline && details.headline !== null,
    stage: details.visibility.stage && details.stage !== null,
    interests: details.visibility.interests && details.interests.length > 0,
    spokenLanguages:
      details.visibility.spokenLanguages && details.spokenLanguages.length > 0,
    skills: details.visibility.skills && details.skills.length > 0,
    links: details.visibility.links && details.links.length > 0,
    openTo: details.visibility.openTo && details.openTo.length > 0,
  },
});

export const updateProfileSchema = profileDetailsSchema
  .extend({
    displayName: displayNameSchema,
    expectedRevision: profileRevisionSchema,
  })
  .transform(normalizeProfile);

export const ownerProfileSchema = profileDetailsSchema
  .extend({
    userId: profileIdentitySchema,
    displayName: z.union([displayNameSchema, z.literal('')]),
    photoAssetId: idSchema.nullable(),
    memberSince: memberSinceSchema,
    revision: profileRevisionSchema,
  })
  .transform(normalizeProfile);

export type ProfileDetails = z.infer<typeof profileDetailsSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type OwnerProfile = z.infer<typeof ownerProfileSchema>;
