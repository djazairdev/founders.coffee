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
