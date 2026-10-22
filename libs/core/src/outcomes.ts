import { z } from 'zod';

export const RSVP_CREATION_OUTCOMES = [
  'created',
  'event_missing',
  'already_rsvpd',
  'rsvp_closed',
] as const;
export type RsvpCreationOutcome = (typeof RSVP_CREATION_OUTCOMES)[number];
export const rsvpCreationOutcomeSchema = z.enum(RSVP_CREATION_OUTCOMES);

export const WAITLIST_JOIN_OUTCOMES = ['joined', 'already_waitlisted'] as const;
export type WaitlistJoinOutcome = (typeof WAITLIST_JOIN_OUTCOMES)[number];
export const waitlistJoinOutcomeSchema = z.enum(WAITLIST_JOIN_OUTCOMES);

export const ATTENDANCE_RECORDING_OUTCOMES = [
  'recorded',
  'not_host',
  'not_eligible',
  'not_ended',
  'event_cancelled',
] as const;
export type AttendanceRecordingOutcome =
  (typeof ATTENDANCE_RECORDING_OUTCOMES)[number];
export const attendanceRecordingOutcomeSchema = z.enum(
  ATTENDANCE_RECORDING_OUTCOMES,
);

export const CLOSEOUT_SUBMISSION_OUTCOMES = [
  'submitted',
  'already_closed',
  'not_host',
  'not_ended',
  'no_end_time',
  'event_cancelled',
] as const;
export type CloseoutSubmissionOutcome =
  (typeof CLOSEOUT_SUBMISSION_OUTCOMES)[number];
export const closeoutSubmissionOutcomeSchema = z.enum(
  CLOSEOUT_SUBMISSION_OUTCOMES,
);

export const CLOSEOUT_CORRECTION_OUTCOMES = [
  'corrected',
  'stale_version',
  'not_closed',
] as const;
export type CloseoutCorrectionOutcome =
  (typeof CLOSEOUT_CORRECTION_OUTCOMES)[number];
export const closeoutCorrectionOutcomeSchema = z.enum(
  CLOSEOUT_CORRECTION_OUTCOMES,
);

export const FEEDBACK_SUBMISSION_OUTCOMES = [
  'saved',
  'not_attended',
  'window_closed',
  'not_invited',
  'is_host',
] as const;
export type FeedbackSubmissionOutcome =
  (typeof FEEDBACK_SUBMISSION_OUTCOMES)[number];
export const feedbackSubmissionOutcomeSchema = z.enum(
  FEEDBACK_SUBMISSION_OUTCOMES,
);

export const FEEDBACK_ELIGIBILITY_STATUSES = [
  'ready',
  'not_attended',
  'not_invited',
  'window_closed',
  'is_host',
] as const;
export type FeedbackEligibilityStatus =
  (typeof FEEDBACK_ELIGIBILITY_STATUSES)[number];
export const feedbackEligibilityStatusSchema = z.enum(
  FEEDBACK_ELIGIBILITY_STATUSES,
);

export const CLOSEOUT_PROMPT_OUTCOMES = [
  'scheduled',
  'already_scheduled',
  'no_end_time',
  'no_channels',
] as const;
export type CloseoutPromptOutcome = (typeof CLOSEOUT_PROMPT_OUTCOMES)[number];
export const closeoutPromptOutcomeSchema = z.enum(CLOSEOUT_PROMPT_OUTCOMES);

export const NOTIFICATION_DISPATCH_KINDS = ['sent', 'failed'] as const;
export type NotificationDispatchKind =
  (typeof NOTIFICATION_DISPATCH_KINDS)[number];
export const notificationDispatchKindSchema = z.enum(
  NOTIFICATION_DISPATCH_KINDS,
);

export const OPERATIONS_ERROR_CODES = [
  'event_not_ended',
  'event_no_end_time',
  'event_cancelled',
  'not_event_host',
  'attendee_not_eligible',
  'closeout_already_recorded',
  'closeout_not_recorded',
  'closeout_stale_version',
  'feedback_not_attended',
  'feedback_not_invited',
  'feedback_window_closed',
  'feedback_is_host',
  'operations_disabled',
] as const;
export type OperationsErrorCode = (typeof OPERATIONS_ERROR_CODES)[number];
export const operationsErrorCodeSchema = z.enum(OPERATIONS_ERROR_CODES);

export const isOperationsErrorCode = (
  code: string,
): code is OperationsErrorCode =>
  (OPERATIONS_ERROR_CODES as readonly string[]).includes(code);

export const ORGANISATION_ERROR_CODES = [
  'organisation_slug_taken',
  'organisation_not_approved',
  'invalid_organisation_transition',
  'organisation_already_member',
  'organisation_invitation_not_found',
  'organisation_invitation_expired',
  'organisation_email_unverified',
  'organisation_invitation_failed',
  'organisation_not_found',
  'organisation_member_not_found',
  'organisation_member_protected',
  'organisation_member_remove_failed',
  'organisation_already_organiser',
  'organisation_not_co_host',
] as const;
export type OrganisationErrorCode = (typeof ORGANISATION_ERROR_CODES)[number];

export const HACKATHON_ERROR_CODES = [
  'hackathons_disabled',
  'hackathon_requires_registration',
  'registration_closed',
  'already_registered',
  'attendance_mode_unavailable',
  'not_eligible',
  'teams_locked',
  'not_registered',
  'already_in_team',
  'team_full',
  'team_name_taken',
  'not_team_member',
  'not_team_captain',
  'captain_must_transfer',
  'track_not_in_hackathon',
  'ai_tools_required',
  'hackathon_not_editable',
  'hackathon_save_failed',
  'hackathon_conflict',
  'hackathon_field_locked',
  'hackathon_details_required',
  'hackathon_track_has_prizes',
  'hackathon_prize_not_found',
  'withdrawal_closed',
] as const;
export type HackathonErrorCode = (typeof HACKATHON_ERROR_CODES)[number];
export const hackathonErrorCodeSchema = z.enum(HACKATHON_ERROR_CODES);
