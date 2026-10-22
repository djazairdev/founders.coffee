import { z } from 'zod';

export const NOTIFICATION_DELIVERY_CHANNELS = ['sms', 'email', 'push'] as const;
export type NotificationDeliveryChannel =
  (typeof NOTIFICATION_DELIVERY_CHANNELS)[number];
export const notificationDeliveryChannelSchema = z.enum(
  NOTIFICATION_DELIVERY_CHANNELS,
);

export const NOTIFICATION_PREFERENCE_CHANNELS = ['push', 'email'] as const;
export type NotificationPreferenceChannel =
  (typeof NOTIFICATION_PREFERENCE_CHANNELS)[number];
export const notificationPreferenceChannelSchema = z.enum(
  NOTIFICATION_PREFERENCE_CHANNELS,
);

export const NOTIFICATION_FALLBACK_CHANNELS = ['email', 'sms'] as const;
export type NotificationFallbackChannel =
  (typeof NOTIFICATION_FALLBACK_CHANNELS)[number];
export const notificationFallbackChannelSchema = z.enum(
  NOTIFICATION_FALLBACK_CHANNELS,
);

export const NOTIFICATION_STATUSES = [
  'pending',
  'processing',
  'sent',
  'delivered',
  'failed',
  'cancelled',
] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];
export const notificationStatusSchema = z.enum(NOTIFICATION_STATUSES);

export const NOTIFICATION_TEMPLATE_KEYS = [
  'rsvp_confirmation',
  'reminder_72h',
  'reminder_24h',
  'event_cancelled',
  'event_rescheduled',
  'event_relocated',
  'rsvp_received',
  'rsvp_cancelled',
  'closeout_prompt',
  'event_did_not_happen',
  'feedback_invitation',
  'chat_unread',
  'hackathon_registered',
  'hackathon_waitlisted',
  'hackathon_promoted',
  'hackathon_registration_closing',
  'hackathon_kickoff',
  'hackathon_deadline_24h',
  'hackathon_deadline_1h',
  'hackathon_judging_open',
  'hackathon_team_request',
  'hackathon_team_accepted',
  'hackathon_team_declined',
  'hackathon_team_joined',
  'hackathon_team_left',
  'hackathon_submission_received',
] as const;
export type NotificationTemplateKey =
  (typeof NOTIFICATION_TEMPLATE_KEYS)[number];
export const notificationTemplateKeySchema = z.enum(NOTIFICATION_TEMPLATE_KEYS);

export const RSVP_LIFECYCLE_TEMPLATE_KEYS = [
  'rsvp_confirmation',
  'reminder_72h',
  'reminder_24h',
  'event_cancelled',
  'event_rescheduled',
  'event_relocated',
] as const satisfies readonly NotificationTemplateKey[];

export const HACKATHON_REGISTRATION_TEMPLATE_KEYS = [
  'hackathon_registered',
  'hackathon_waitlisted',
  'hackathon_promoted',
] as const satisfies readonly NotificationTemplateKey[];
export type HackathonRegistrationTemplateKey =
  (typeof HACKATHON_REGISTRATION_TEMPLATE_KEYS)[number];

export const HACKATHON_TEAM_TEMPLATE_KEYS = [
  'hackathon_team_request',
  'hackathon_team_accepted',
  'hackathon_team_declined',
  'hackathon_team_joined',
  'hackathon_team_left',
  'hackathon_submission_received',
] as const satisfies readonly NotificationTemplateKey[];
export type HackathonTeamTemplateKey =
  (typeof HACKATHON_TEAM_TEMPLATE_KEYS)[number];

export const HACKATHON_ORGANISER_REMINDER_KEYS = [
  'hackathon_registration_closing',
  'hackathon_judging_open',
] as const satisfies readonly NotificationTemplateKey[];

export const HACKATHON_DEADLINE_REMINDER_KEYS = [
  'hackathon_deadline_24h',
  'hackathon_deadline_1h',
] as const satisfies readonly NotificationTemplateKey[];
export type HackathonDeadlineReminderKey =
  (typeof HACKATHON_DEADLINE_REMINDER_KEYS)[number];

export const HACKATHON_PARTICIPANT_REMINDER_KEYS = [
  'hackathon_kickoff',
  ...HACKATHON_DEADLINE_REMINDER_KEYS,
] as const satisfies readonly NotificationTemplateKey[];

export const HACKATHON_REMINDER_KEYS = [
  ...HACKATHON_ORGANISER_REMINDER_KEYS,
  ...HACKATHON_PARTICIPANT_REMINDER_KEYS,
] as const;
export type HackathonReminderKey = (typeof HACKATHON_REMINDER_KEYS)[number];
