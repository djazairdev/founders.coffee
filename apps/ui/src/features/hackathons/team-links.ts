import type { Locale } from '@founders-coffee/i18n';

/**
 * The address a team's invite link opens (B-TEAM-04, B-TEAM-07): the hackathon's team page, with
 * the token in the query so it survives the sign-in a signed-out member is sent through first.
 */
export const teamInviteUrl = (
  origin: string,
  locale: Locale,
  eventId: string,
  token: string,
): string =>
  `${origin}/${locale}/hackathon/${encodeURIComponent(eventId)}/team?join=${encodeURIComponent(token)}`;
