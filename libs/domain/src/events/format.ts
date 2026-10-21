import { z } from 'zod';

import type { EventFormat } from '@founders-coffee/core';

import { isCredentialFreeHttpsUrl } from '../profile/schemas.js';

export const EVENT_MEETING_URL_MAX_LENGTH = 2048;

export const eventMeetingUrlSchema = z
  .string()
  .trim()
  .max(EVENT_MEETING_URL_MAX_LENGTH)
  .refine(isCredentialFreeHttpsUrl, 'A credential-free HTTPS URL is required');

export type EventFormatFields = {
  readonly cityCode?: string;
  readonly venueName?: string;
  readonly venueAddress?: string;
  readonly venueProviderId?: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly meetingUrl?: string;
};

export type EventFormatIssue = {
  readonly path: keyof EventFormatFields;
  readonly message: string;
};

const VENUE_FIELDS = [
  'venueName',
  'venueAddress',
  'venueProviderId',
  'latitude',
  'longitude',
] as const satisfies readonly (keyof EventFormatFields)[];

/** Whether an event of this format takes place somewhere: in person, or hybrid. */
export const hasVenue = (format: EventFormat): boolean => format !== 'online';

/** Whether an event of this format is joined through a meeting link: online, or hybrid. */
export const hasMeetingLink = (format: EventFormat): boolean =>
  format !== 'in_person';

/**
 * What an event's fields lack, or carry wrongly, for its format: an in-person event needs a venue,
 * an online one a meeting link, and a hybrid one both. An online event carries no venue at all, and
 * an in-person one no link, so a field the format does not use is refused rather than stored unseen.
 * `required` names the venue fields this caller must send, since an edit may keep its point.
 */
export const eventFormatIssues = (
  format: EventFormat,
  fields: EventFormatFields,
  required: readonly (typeof VENUE_FIELDS)[number][],
): readonly EventFormatIssue[] => {
  const issues: EventFormatIssue[] = [];
  if (hasVenue(format)) {
    for (const path of required)
      if (fields[path] === undefined)
        issues.push({ path, message: 'This event format needs a venue' });
  } else {
    for (const path of VENUE_FIELDS)
      if (fields[path] !== undefined)
        issues.push({ path, message: 'An online event has no venue' });
  }
  if (hasMeetingLink(format) && fields.meetingUrl === undefined)
    issues.push({
      path: 'meetingUrl',
      message: 'This event format needs an HTTPS meeting link',
    });
  if (!hasMeetingLink(format) && fields.meetingUrl !== undefined)
    issues.push({
      path: 'meetingUrl',
      message: 'An in-person event has no meeting link',
    });
  return issues;
};

export const CREATE_VENUE_FIELDS = [
  'venueName',
  'venueAddress',
  'latitude',
  'longitude',
] as const;

export const UPDATE_VENUE_FIELDS = ['venueName'] as const;

/** Add the format's issues to a schema's refinement. */
export const addFormatIssues = (
  issues: readonly EventFormatIssue[],
  context: z.RefinementCtx,
) => {
  for (const issue of issues)
    context.addIssue({
      code: 'custom',
      message: issue.message,
      path: [issue.path],
    });
};
