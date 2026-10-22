import type {
  HackathonDeadlineReminderKey,
  HackathonReminderKey,
} from '@founders-coffee/core';
import {
  ntf_email_hackathon_deadline_1h_html,
  ntf_email_hackathon_deadline_1h_subject,
  ntf_email_hackathon_deadline_1h_team_html,
  ntf_email_hackathon_deadline_1h_team_text,
  ntf_email_hackathon_deadline_1h_text,
  ntf_email_hackathon_deadline_24h_html,
  ntf_email_hackathon_deadline_24h_subject,
  ntf_email_hackathon_deadline_24h_team_html,
  ntf_email_hackathon_deadline_24h_team_text,
  ntf_email_hackathon_deadline_24h_text,
  ntf_email_hackathon_judging_open_html,
  ntf_email_hackathon_judging_open_subject,
  ntf_email_hackathon_judging_open_text,
  ntf_email_hackathon_kickoff_html,
  ntf_email_hackathon_kickoff_subject,
  ntf_email_hackathon_kickoff_text,
  ntf_email_hackathon_registration_closing_html,
  ntf_email_hackathon_registration_closing_subject,
  ntf_email_hackathon_registration_closing_text,
  ntf_push_hackathon_deadline_1h_body,
  ntf_push_hackathon_deadline_1h_team_body,
  ntf_push_hackathon_deadline_1h_title,
  ntf_push_hackathon_deadline_24h_body,
  ntf_push_hackathon_deadline_24h_team_body,
  ntf_push_hackathon_deadline_24h_title,
  ntf_push_hackathon_judging_open_body,
  ntf_push_hackathon_judging_open_title,
  ntf_push_hackathon_kickoff_body,
  ntf_push_hackathon_kickoff_title,
  ntf_push_hackathon_registration_closing_body,
  ntf_push_hackathon_registration_closing_title,
  type Locale,
} from '@founders-coffee/i18n';

import type { TemplateValues } from './templates.js';

type Message = (
  values: Pick<TemplateValues, 'title' | 'url'>,
  options: { locale: Locale },
) => string;

type TeamMessage = (
  values: Pick<TemplateValues, 'title' | 'url'> & { readonly team: string },
  options: { locale: Locale },
) => string;

export const REMINDER_MESSAGES: Record<
  HackathonReminderKey,
  readonly [Message, Message, Message, Message, Message]
> = {
  hackathon_registration_closing: [
    ntf_push_hackathon_registration_closing_title,
    ntf_push_hackathon_registration_closing_body,
    ntf_email_hackathon_registration_closing_subject,
    ntf_email_hackathon_registration_closing_html,
    ntf_email_hackathon_registration_closing_text,
  ],
  hackathon_kickoff: [
    ntf_push_hackathon_kickoff_title,
    ntf_push_hackathon_kickoff_body,
    ntf_email_hackathon_kickoff_subject,
    ntf_email_hackathon_kickoff_html,
    ntf_email_hackathon_kickoff_text,
  ],
  hackathon_deadline_24h: [
    ntf_push_hackathon_deadline_24h_title,
    ntf_push_hackathon_deadline_24h_body,
    ntf_email_hackathon_deadline_24h_subject,
    ntf_email_hackathon_deadline_24h_html,
    ntf_email_hackathon_deadline_24h_text,
  ],
  hackathon_deadline_1h: [
    ntf_push_hackathon_deadline_1h_title,
    ntf_push_hackathon_deadline_1h_body,
    ntf_email_hackathon_deadline_1h_subject,
    ntf_email_hackathon_deadline_1h_html,
    ntf_email_hackathon_deadline_1h_text,
  ],
  hackathon_judging_open: [
    ntf_push_hackathon_judging_open_title,
    ntf_push_hackathon_judging_open_body,
    ntf_email_hackathon_judging_open_subject,
    ntf_email_hackathon_judging_open_html,
    ntf_email_hackathon_judging_open_text,
  ],
};

export const TEAM_DEADLINE_MESSAGES: Record<
  HackathonDeadlineReminderKey,
  readonly [TeamMessage, TeamMessage, TeamMessage, TeamMessage, TeamMessage]
> = {
  hackathon_deadline_24h: [
    ntf_push_hackathon_deadline_24h_title,
    ntf_push_hackathon_deadline_24h_team_body,
    ntf_email_hackathon_deadline_24h_subject,
    ntf_email_hackathon_deadline_24h_team_html,
    ntf_email_hackathon_deadline_24h_team_text,
  ],
  hackathon_deadline_1h: [
    ntf_push_hackathon_deadline_1h_title,
    ntf_push_hackathon_deadline_1h_team_body,
    ntf_email_hackathon_deadline_1h_subject,
    ntf_email_hackathon_deadline_1h_team_html,
    ntf_email_hackathon_deadline_1h_team_text,
  ],
};
