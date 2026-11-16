import {
  isReservedOrganisationSlug,
  ORGANISATION_SLUG_MAX_LENGTH,
  ORGANISATION_SLUG_MIN_LENGTH,
} from './schemas.js';

/** A name-derived Latin address, or an empty string when a generated fallback is needed. */
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

/** A generated address with room for its numeric collision suffix, including non-Latin names. */
export const organisationSlugFor = (name: string, suffix: string): string => {
  const base = suggestOrganisationSlug(name) || 'organisation';
  const room = ORGANISATION_SLUG_MAX_LENGTH - suffix.length - 1;
  return `${base.slice(0, room).replace(/-+$/u, '')}-${suffix}`;
};
