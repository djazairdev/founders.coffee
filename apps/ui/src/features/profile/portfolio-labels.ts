import {
  PROFILE_LINK_KINDS,
  PROFILE_OPEN_TO,
  type ProfileLinkKind,
  type ProfileOpenTo,
} from '@founders-coffee/core';
import {
  open_to_co_founding,
  open_to_internships,
  open_to_jobs,
  profile_link_github_invalid,
  profile_link_github_label,
  profile_link_github_placeholder,
  profile_link_invalid,
  profile_link_label,
  profile_link_linkedin_invalid,
  profile_link_linkedin_label,
  profile_link_linkedin_placeholder,
  profile_link_placeholder,
  profile_view_link,
  type Locale,
} from '@founders-coffee/i18n';

type Message = (
  input: Record<string, never>,
  options: { locale: Locale },
) => string;

const OPEN_TO_MESSAGES = {
  jobs: open_to_jobs,
  internships: open_to_internships,
  co_founding: open_to_co_founding,
} as const satisfies Record<ProfileOpenTo, Message>;

const LINK_FIELDS = {
  github: {
    label: profile_link_github_label,
    placeholder: profile_link_github_placeholder,
    invalid: profile_link_github_invalid,
  },
  linkedin: {
    label: profile_link_linkedin_label,
    placeholder: profile_link_linkedin_placeholder,
    invalid: profile_link_linkedin_invalid,
  },
  website: {
    label: profile_link_label,
    placeholder: profile_link_placeholder,
    invalid: profile_link_invalid,
  },
} as const satisfies Record<
  ProfileLinkKind,
  { label: Message; placeholder: Message; invalid: Message }
>;

export const OPEN_TO_OPTIONS = PROFILE_OPEN_TO;
export const LINK_KIND_OPTIONS = PROFILE_LINK_KINDS;

/** Name something a member is open to in the reader's language. */
export const openToLabel = (openTo: ProfileOpenTo, locale: Locale): string =>
  OPEN_TO_MESSAGES[openTo]({}, { locale });

/** The label, placeholder and refusal of the field that holds one kind of link. */
export const linkFieldText = (kind: ProfileLinkKind, locale: Locale) => ({
  label: LINK_FIELDS[kind].label({}, { locale }),
  placeholder: LINK_FIELDS[kind].placeholder({}, { locale }),
  invalid: LINK_FIELDS[kind].invalid({}, { locale }),
});

/** What a published link is called on a public profile, where the website is not the reader's own. */
export const publicLinkLabel = (
  kind: ProfileLinkKind,
  locale: Locale,
): string =>
  kind === 'website'
    ? profile_view_link({}, { locale })
    : LINK_FIELDS[kind].label({}, { locale });
