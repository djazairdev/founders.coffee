import { z } from 'zod';

import { isCredentialFreeHttpsUrl } from '../profile/schemas.js';

export const HACKATHON_TRACK_LIMIT = 10;
export const HACKATHON_TRACK_SOURCE_LIMIT = 20;

const HUB_LOCALES = ['ar', 'fr', 'en'];
const GITHUB_OWNER = /^[A-Za-z0-9-]{1,39}$/;
const GITHUB_REPOSITORY = /^[A-Za-z0-9._-]{1,100}$/;

/**
 * Whether a link is one an open-source track can be built from: a GitHub repository
 * (`github.com/{owner}/{repo}`), one of its issues (`…/issues/{n}`), or a page of the djazair.dev
 * Hub (`djazair.dev/{locale}/hub/…`), whose issues are GitHub issues filtered by repository. HTTPS
 * only, with no credentials.
 */
export const isOpenSourceTrackUrl = (value: string): boolean => {
  if (!isCredentialFreeHttpsUrl(value)) return false;
  const url = new URL(value);
  const segments = url.pathname.split('/').filter(Boolean);
  if (url.hostname === 'github.com' || url.hostname === 'www.github.com') {
    const [owner = '', repository = '', section, number = ''] = segments;
    const isRepository =
      GITHUB_OWNER.test(owner) && GITHUB_REPOSITORY.test(repository);
    return (
      isRepository &&
      (segments.length === 2 ||
        (segments.length === 4 &&
          section === 'issues' &&
          /^[1-9][0-9]*$/.test(number)))
    );
  }
  if (url.hostname === 'djazair.dev')
    return HUB_LOCALES.includes(segments[0] ?? '') && segments[1] === 'hub';
  return false;
};

const title = z.string().trim().min(3).max(100);
const brief = z.string().trim().min(20).max(2000);

const sourceUrl = z
  .string()
  .trim()
  .max(2048)
  .refine(
    isOpenSourceTrackUrl,
    'A GitHub repository or issue, or a djazair.dev Hub link, is required',
  );

export const hackathonTrackSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('founder_problem'), title, brief }),
  z.strictObject({
    kind: z.literal('partner_technology'),
    title,
    brief,
    partnerName: z.string().trim().min(2).max(100),
  }),
  z.strictObject({
    kind: z.literal('open_source'),
    title,
    brief,
    sourceUrls: z
      .array(sourceUrl)
      .min(1)
      .max(HACKATHON_TRACK_SOURCE_LIMIT)
      .refine((urls) => new Set(urls).size === urls.length, 'Each link once'),
  }),
]);

export type HackathonTrackInput = z.infer<typeof hackathonTrackSchema>;

export const hackathonTracksSchema = z
  .array(hackathonTrackSchema)
  .min(1)
  .max(HACKATHON_TRACK_LIMIT);
