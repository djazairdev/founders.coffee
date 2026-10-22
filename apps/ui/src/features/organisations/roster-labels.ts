import {
  formatDate,
  org_role_admin,
  org_role_member,
  org_role_owner,
  type Locale,
} from '@founders-coffee/i18n';

const ROLE_LABELS = {
  owner: org_role_owner,
  admin: org_role_admin,
  member: org_role_member,
} as const;

const ROLE_ORDER = ['owner', 'admin', 'member'] as const;

/**
 * The label of a member's role. A member row may hold several roles, comma-separated; the first one
 * this page names is shown, owner before admin before member, and an unknown role reads as member.
 */
export const roleLabel = (role: string, locale: Locale): string => {
  const names = role.split(',').map((name) => name.trim());
  const shown = ROLE_ORDER.find((name) => names.includes(name)) ?? 'member';
  return ROLE_LABELS[shown]({}, { locale });
};

/** A day on this page, in the organisation's market time zone, with the month spelled out. */
export const rosterDate = (date: Date, locale: Locale, timeZone: string) =>
  formatDate(date, locale, {
    timeZone,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
