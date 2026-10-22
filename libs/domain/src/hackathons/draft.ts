import { z } from 'zod';

import {
  ATTENDANCE_MODES,
  attendanceModeSchema,
  hackathonAiPolicySchema,
  type EventFormat,
} from '@founders-coffee/core';

import {
  addEventCreateIssues,
  EVENT_CREATE_FIELDS,
} from '../events/schemas.js';
import { isAttendanceModeOffered } from './registration.js';
import { TEAM_SIZE_CEILING, teamSizeLimitsSchema } from './teams.js';
import { hackathonTimelineSchema } from './timeline.js';

export const HACKATHON_RULES_MAX_LENGTH = 10_000;
export const HACKATHON_NOTE_MAX_LENGTH = 1000;
export const HACKATHON_CAPACITY_MAX = 100_000;
export const HACKATHON_MINIMUM_AGE_MAX = 99;

const instant = z.number().int().positive();
const teamSize = z.number().int().min(1).max(TEAM_SIZE_CEILING);
const note = z.string().trim().min(1).max(HACKATHON_NOTE_MAX_LENGTH);

const TIMELINE_PATHS = {
  kickoffAt: 'startsAt',
} as const;

export type HackathonEventFrame = {
  readonly startsAt: number;
  readonly endsAt: number;
  readonly format: EventFormat;
};

const hackathonDetailsShape = z
  .object({
    registrationOpensAt: instant,
    registrationClosesAt: instant,
    submissionDeadlineAt: instant,
    judgingEndsAt: instant,
    attendanceModes: z
      .array(attendanceModeSchema)
      .min(1)
      .max(ATTENDANCE_MODES.length),
    teamMin: teamSize,
    teamMax: teamSize,
    capacity: z
      .number()
      .int()
      .positive()
      .max(HACKATHON_CAPACITY_MAX)
      .optional(),
    minimumAge: z
      .number()
      .int()
      .positive()
      .max(HACKATHON_MINIMUM_AGE_MAX)
      .optional(),
    rules: z.string().trim().min(1).max(HACKATHON_RULES_MAX_LENGTH).optional(),
    aiPolicy: hackathonAiPolicySchema,
    aiPolicyNote: note.optional(),
    licenceNote: note.optional(),
  })
  .strict();

export type HackathonDetailsInput = z.infer<typeof hackathonDetailsShape>;

/**
 * Hold a hackathon's details to the event they belong to. Kickoff is the event's start and demo
 * day its end, and the timeline rules place the registration and judging dates around them. The
 * team size is a range within the ceiling, and each attendance mode is one the format offers, each
 * once. No value is assumed: V14 has each organiser set the AI policy, and the dates, team size and
 * attendance are theirs to choose. Rules, a minimum age, capacity and the two notes are optional.
 */
const addDetailsIssues = (
  details: HackathonDetailsInput,
  event: HackathonEventFrame,
  context: z.RefinementCtx,
): void => {
  const timeline = hackathonTimelineSchema.safeParse({
    registrationOpensAt: details.registrationOpensAt,
    registrationClosesAt: details.registrationClosesAt,
    kickoffAt: event.startsAt,
    submissionDeadlineAt: details.submissionDeadlineAt,
    endsAt: event.endsAt,
    judgingEndsAt: details.judgingEndsAt,
  });
  for (const issue of timeline.error?.issues ?? []) {
    const field = String(issue.path[0]);
    context.addIssue({
      code: 'custom',
      message: issue.message,
      path: [TIMELINE_PATHS[field as keyof typeof TIMELINE_PATHS] ?? field],
    });
  }
  if (
    !teamSizeLimitsSchema.safeParse({
      min: details.teamMin,
      max: details.teamMax,
    }).success
  )
    context.addIssue({
      code: 'custom',
      message: 'The largest team cannot be smaller than the smallest',
      path: ['teamMax'],
    });
  if (new Set(details.attendanceModes).size !== details.attendanceModes.length)
    context.addIssue({
      code: 'custom',
      message: 'Each attendance mode once',
      path: ['attendanceModes'],
    });
  if (
    !details.attendanceModes.every((mode) =>
      isAttendanceModeOffered(event.format, mode),
    )
  )
    context.addIssue({
      code: 'custom',
      message: `A ${event.format} hackathon cannot be attended that way`,
      path: ['attendanceModes'],
    });
};

/**
 * The details of a hackathon whose event is already saved (B-HKN-12), held to that event's
 * kickoff, demo day and format.
 */
export const hackathonDetailsFor = (event: HackathonEventFrame) =>
  hackathonDetailsShape.superRefine((details, context) =>
    addDetailsIssues(details, event, context),
  );

export const hackathonDetailsSchema = hackathonDetailsShape;

const hackathonDraftShape = hackathonDetailsShape
  .extend(EVENT_CREATE_FIELDS)
  .strict();

type HackathonDraftInput = z.infer<typeof hackathonDraftShape>;

/**
 * Hold a hackathon's whole draft (B-HKN-06) to the rules the published one will need: its event
 * fields follow every new event's rules for the hackathon's own type, so it may run up to fourteen
 * days, and its details are held to that event.
 */
const addDraftIssues = (
  input: HackathonDraftInput,
  context: z.RefinementCtx,
): void => {
  addEventCreateIssues({ ...input, kind: 'hackathon' }, context);
  addDetailsIssues(input, input, context);
};

export const hackathonDraftSchema =
  hackathonDraftShape.superRefine(addDraftIssues);

export type HackathonDraft = z.infer<typeof hackathonDraftSchema>;
