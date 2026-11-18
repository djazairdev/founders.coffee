import { z } from 'zod';

import { idSchema, projectStageSchema } from '@founders-coffee/core';

import {
  hackathonRecordEntrySchema,
  type HackathonRecordEntry,
} from './hackathon-record.js';
import {
  spokenLanguageSchema,
  displayNameSchema,
  headlineSchema,
  introductionSchema,
  memberSinceSchema,
  profileInterestSchema,
  profileIdentitySchema,
  profileLinksSchema,
  profileOpenToListSchema,
  profileSkillsSchema,
  profileStageSchema,
  type OwnerProfile,
} from './schemas.js';

export const publicProfileProjectSchema = z.strictObject({
  slug: z.string(),
  title: z.string(),
  stage: projectStageSchema,
  hackathonTitle: z.string().nullable(),
  rank: z.number().int().positive().nullable(),
  trackRank: z.number().int().positive().nullable(),
});

export type PublicProfileProject = z.infer<typeof publicProfileProjectSchema>;

export const publicMemberProfileSchema = z.strictObject({
  userId: profileIdentitySchema,
  displayName: displayNameSchema,
  photoAssetId: idSchema.nullable(),
  memberSince: memberSinceSchema,
  headline: headlineSchema,
  stage: profileStageSchema.nullable(),
  introduction: introductionSchema,
  interests: z.array(profileInterestSchema).max(5),
  spokenLanguages: z.array(spokenLanguageSchema).max(6),
  skills: profileSkillsSchema,
  links: profileLinksSchema,
  openTo: profileOpenToListSchema,
  indexable: z.boolean(),
  hostedCount: z.number().int().nonnegative(),
  attendedCount: z.number().int().nonnegative().nullable(),
  hackathonRecord: z.array(hackathonRecordEntrySchema),
  projects: z.array(publicProfileProjectSchema),
});

export type PublicMemberProfile = z.infer<typeof publicMemberProfileSchema>;

export type MeetupRecord = {
  readonly hosted: number;
  readonly attended: number;
};

/** Project public identity/avatar and opted-in details; authorization and asset delivery stay server-side. */
export const projectPublicProfile = (
  profile: OwnerProfile,
  record: MeetupRecord,
  hackathonRecord: readonly HackathonRecordEntry[] = [],
  projects: readonly PublicProfileProject[] = [],
): PublicMemberProfile => ({
  userId: profile.userId,
  displayName: profile.displayName,
  photoAssetId: profile.photoAssetId,
  memberSince: profile.memberSince,
  headline: profile.visibility.headline ? profile.headline : null,
  stage: profile.visibility.stage ? profile.stage : null,
  introduction: profile.introduction,
  interests: profile.visibility.interests ? [...profile.interests] : [],
  spokenLanguages: profile.visibility.spokenLanguages
    ? [...profile.spokenLanguages]
    : [],
  skills: profile.visibility.skills ? [...profile.skills] : [],
  links: profile.visibility.links ? [...profile.links] : [],
  openTo: profile.visibility.openTo ? [...profile.openTo] : [],
  indexable: profile.indexable,
  hostedCount: record.hosted,
  attendedCount: profile.visibility.attendedCount ? record.attended : null,
  hackathonRecord: profile.visibility.hackathonRecord
    ? [...hackathonRecord]
    : [],
  projects: [...projects],
});
