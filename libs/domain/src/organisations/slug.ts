import {
  isReservedOrganisationSlug,
  ORGANISATION_SLUG_MAX_LENGTH,
  ORGANISATION_SLUG_MIN_LENGTH,
} from './schemas.js';

/**
 * An address to offer for an organisation called `name`, or `''` when its name gives none.
 *
 * Accents are dropped and every run of anything but a Latin letter or digit becomes one hyphen,
 * so "École 42 Alger" offers `ecole-42-alger`. A name in Arabic script has no Latin letters to
 * offer, and the applicant types the address themselves. The offer is cut at a hyphen to fit the
 * length limit, and a reserved word is never offered.
 */
export const suggestOrganisationSlug = (name: string): string => {
  const words = name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter(Boolean);
  let slug = '';
  for (const word of words) {
    const next = slug ? `${slug}-${word}` : word;
    if (next.length > ORGANISATION_SLUG_MAX_LENGTH) break;
    slug = next;
  }
  if (!slug && words[0]) slug = words[0].slice(0, ORGANISATION_SLUG_MAX_LENGTH);
  return slug.length >= ORGANISATION_SLUG_MIN_LENGTH &&
    !isReservedOrganisationSlug(slug)
    ? slug
    : '';
};
