import { z } from 'zod';

export const HACKATHON_PHASES = [
  'upcoming',
  'registration_open',
  'registration_closed',
  'building',
  'judging',
  'results',
] as const;
export type HackathonPhase = (typeof HACKATHON_PHASES)[number];
export const hackathonPhaseSchema = z.enum(HACKATHON_PHASES);

export const EVENT_FORMATS = ['in_person', 'online', 'hybrid'] as const;
export type EventFormat = (typeof EVENT_FORMATS)[number];
export const eventFormatSchema = z.enum(EVENT_FORMATS);

export const ATTENDANCE_MODES = ['in_person', 'online'] as const;
export type AttendanceMode = (typeof ATTENDANCE_MODES)[number];
export const attendanceModeSchema = z.enum(ATTENDANCE_MODES);

export const REGISTRATION_STATUSES = ['registered', 'waitlisted'] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];
export const registrationStatusSchema = z.enum(REGISTRATION_STATUSES);

export const HACKATHON_REGISTRATION_STATUSES = [
  ...REGISTRATION_STATUSES,
  'withdrawn',
  'disqualified',
] as const;
export type HackathonRegistrationStatus =
  (typeof HACKATHON_REGISTRATION_STATUSES)[number];
export const hackathonRegistrationStatusSchema = z.enum(
  HACKATHON_REGISTRATION_STATUSES,
);

export const HACKATHON_REGISTRATION_SKILLS_MAX = 140;

export const HACKATHON_TEAM_NAME_MAX = 60;
export const HACKATHON_TEAM_DESCRIPTION_MAX = 500;

export const HACKATHON_TEAM_REQUEST_STATUSES = [
  'pending',
  'accepted',
  'declined',
  'cancelled',
] as const;
export type HackathonTeamRequestStatus =
  (typeof HACKATHON_TEAM_REQUEST_STATUSES)[number];
export const hackathonTeamRequestStatusSchema = z.enum(
  HACKATHON_TEAM_REQUEST_STATUSES,
);

export const HACKATHON_SUBMISSION_TITLE_MAX = 100;
export const HACKATHON_SUBMISSION_DESCRIPTION_MAX = 2000;
export const HACKATHON_SUBMISSION_AI_STATEMENT_MAX = 1000;
export const HACKATHON_SUBMISSION_URL_MAX = 2048;
export const HACKATHON_SUBMISSION_PULL_REQUEST_MAX = 10;
export const HACKATHON_SUBMISSION_AI_TOOL_MAX = 10;

export const HACKATHON_SUBMISSION_STATUSES = [
  'draft',
  'submitted',
  'disqualified',
] as const;
export type HackathonSubmissionStatus =
  (typeof HACKATHON_SUBMISSION_STATUSES)[number];
export const hackathonSubmissionStatusSchema = z.enum(
  HACKATHON_SUBMISSION_STATUSES,
);

export const HACKATHON_JUDGE_STATUSES = [
  'invited',
  'accepted',
  'declined',
  'removed',
] as const;
export type HackathonJudgeStatus = (typeof HACKATHON_JUDGE_STATUSES)[number];
export const hackathonJudgeStatusSchema = z.enum(HACKATHON_JUDGE_STATUSES);

export const HACKATHON_MENTOR_STATUSES = HACKATHON_JUDGE_STATUSES;
export type HackathonMentorStatus = HackathonJudgeStatus;
export const HACKATHON_MENTOR_HELPS_WITH_MAX = 160;
export const HACKATHON_MENTOR_OFFICE_HOURS_MAX = 300;

export const HACKATHON_RECUSAL_REASON_MAX = 500;
export const HACKATHON_SCORE_COMMENT_MAX = 1000;

export const HACKATHON_AI_POLICIES = [
  'disclosed',
  'ai_native',
  'restricted',
] as const;
export type HackathonAiPolicy = (typeof HACKATHON_AI_POLICIES)[number];
export const hackathonAiPolicySchema = z.enum(HACKATHON_AI_POLICIES);

export const HACKATHON_REVIEW_STATUSES = [
  'draft',
  'submitted',
  'approved',
  'rejected',
] as const;
export type HackathonReviewStatus = (typeof HACKATHON_REVIEW_STATUSES)[number];
export const hackathonReviewStatusSchema = z.enum(HACKATHON_REVIEW_STATUSES);

export const HACKATHON_TRACK_KINDS = [
  'founder_problem',
  'partner_technology',
  'open_source',
] as const;
export type HackathonTrackKind = (typeof HACKATHON_TRACK_KINDS)[number];
export const hackathonTrackKindSchema = z.enum(HACKATHON_TRACK_KINDS);

export const HACKATHON_CRITERION_SCALES = [5, 10] as const;
export type HackathonCriterionScale =
  (typeof HACKATHON_CRITERION_SCALES)[number];
export const hackathonCriterionScaleSchema = z.union([
  z.literal(5),
  z.literal(10),
]);
