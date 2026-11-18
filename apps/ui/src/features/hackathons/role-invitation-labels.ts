import { appErrorCode, type HackathonJudgeStatus } from '@founders-coffee/core';
import {
  error_title,
  hackathon_mentors_heading,
  hackathon_dashboard_judges,
  hackathon_role_already_held,
  hackathon_role_closed,
  hackathon_role_invalid,
  hackathon_role_limit,
  hackathon_role_participating,
  hackathon_role_status_accepted,
  hackathon_role_status_declined,
  hackathon_role_status_invited,
  hackathon_role_status_removed,
  rate_limited,
  type Locale,
} from '@founders-coffee/i18n';

import type { HackathonRole } from './role-invitations';

export const roleRosterTitle = (role: HackathonRole, locale: Locale) =>
  (role === 'judge' ? hackathon_dashboard_judges : hackathon_mentors_heading)(
    {},
    { locale },
  );

const statusLabels = {
  invited: hackathon_role_status_invited,
  accepted: hackathon_role_status_accepted,
  declined: hackathon_role_status_declined,
  removed: hackathon_role_status_removed,
} satisfies Record<HackathonJudgeStatus, typeof hackathon_role_status_invited>;

export const rolePlaceStatus = (status: HackathonJudgeStatus, locale: Locale) =>
  statusLabels[status]({}, { locale });

export const roleInvitationError = (error: unknown, locale: Locale): string => {
  const options = { locale };
  switch (appErrorCode(error)) {
    case 'judge_invite_invalid':
    case 'mentor_invite_invalid':
    case 'judge_removed':
    case 'mentor_removed':
    case 'judge_not_found':
    case 'mentor_not_found':
      return hackathon_role_invalid({}, options);
    case 'judging_closed':
    case 'hackathon_not_editable':
      return hackathon_role_closed({}, options);
    case 'judge_limit_reached':
    case 'mentor_limit_reached':
      return hackathon_role_limit({}, options);
    case 'already_judge':
    case 'already_mentor':
      return hackathon_role_already_held({}, options);
    case 'already_registered':
      return hackathon_role_participating({}, options);
    case 'rate_limited':
      return rate_limited({}, options);
    default:
      return error_title({}, options);
  }
};
