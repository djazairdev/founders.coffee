import { z } from 'zod';

import { hackathons } from '@founders-coffee/domain';
import type { Locale } from '@founders-coffee/i18n';

export type HackathonRole = hackathons.PlaceRole;
export type RoleInvitation = z.infer<
  typeof hackathons.hackathonPlaceInvitePreviewSchema
>;
export type MentorNote = hackathons.HackathonMentorNote;

export const roleInvitationSearch = z.object({
  role: hackathons.hackathonPlaceInvitePreviewSchema.shape.role
    .optional()
    .catch(undefined),
  token: hackathons.hackathonPlaceInvitePreviewSchema.shape.token
    .optional()
    .catch(undefined),
});

export const parseMentorNote = (helpsWith: string, officeHours: string) =>
  hackathons.hackathonMentorNoteSchema.safeParse({ helpsWith, officeHours });

export const roleInvitationUrl = (
  origin: string,
  locale: Locale,
  invitation: RoleInvitation,
): string => {
  const url = new URL(`/${locale}/hackathon/invitation`, origin);
  url.search = new URLSearchParams(invitation).toString();
  return url.href;
};
