import { z } from 'zod';

import {
  ATTENDANCE_MODES,
  attendanceModeSchema,
  hackathonAiPolicySchema,
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

/**
 * Hold a hackathon's draft, as an organisation creates it (B-HKN-06), to the rules the published one
 * will need. No value is assumed: V14 has each organiser set the AI policy, and the dates, team size
 * and attendance are theirs to choose. Rules, a minimum age, capacity and the two notes are optional.
 *
 * Its event fields follow every new event's rules, for the hackathon's own type, so it may run up to
 * fourteen days. Kickoff is the event's start and demo day its end, and the timeline rules place the
 * registration and judging dates around them. The team size is a range within the ceiling, and each
 * attendance mode is one the format offers, each once.
 */
const addDraftIssues = (
  input: HackathonDraftInput,
  context: z.RefinementCtx,
): void => {
  addEventCreateIssues({ ...input, kind: 'hackathon' }, context);
  const timeline = hackathonTimelineSchema.safeParse({
    registrationOpensAt: input.registrationOpensAt,
    registrationClosesAt: input.registrationClosesAt,
    kickoffAt: input.startsAt,
    submissionDeadlineAt: input.submissionDeadlineAt,
    endsAt: input.endsAt,
    judgingEndsAt: input.judgingEndsAt,
  });
  for (const issue of timeline.error?.issues ?? []) {
    const field = String(issue.path[0]);
    context.addIssue({
      code: 'custom',
      message: issue.message,
      path: [TIMELINE_PATHS[field as keyof typeof TIMELINE_PATHS] ?? field],
    });
  }
  const team = teamSizeLimitsSchema.safeParse({
    min: input.teamMin,
    max: input.teamMax,
  });
  if (!team.success)
    context.addIssue({
      code: 'custom',
      message: 'The largest team cannot be smaller than the smallest',
      path: ['teamMax'],
    });
  if (new Set(input.attendanceModes).size !== input.attendanceModes.length)
    context.addIssue({
      code: 'custom',
      message: 'Each attendance mode once',
      path: ['attendanceModes'],
    });
  if (
    !input.attendanceModes.every((mode) =>
      isAttendanceModeOffered(input.format, mode),
    )
  )
    context.addIssue({
      code: 'custom',
      message: `A ${input.format} hackathon cannot be attended that way`,
      path: ['attendanceModes'],
    });
};

const hackathonDraftShape = z
  .object({
    ...EVENT_CREATE_FIELDS,
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

type HackathonDraftInput = z.infer<typeof hackathonDraftShape>;

export const hackathonDraftSchema =
  hackathonDraftShape.superRefine(addDraftIssues);

export type HackathonDraft = z.infer<typeof hackathonDraftSchema>;
