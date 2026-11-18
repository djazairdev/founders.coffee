import type {
  AttendanceMode,
  HackathonAiPolicy,
  HackathonTrackKind,
} from '@founders-coffee/core';
import {
  hackathon_details_ai_disclosed,
  hackathon_details_ai_disclosed_hint,
  hackathon_details_ai_conditional,
  hackathon_details_ai_conditional_hint,
  hackathon_details_ai_not_allowed,
  hackathon_details_ai_not_allowed_hint,
  hackathon_track_kind_founder_problem,
  hackathon_track_kind_open_source,
  hackathon_track_kind_partner_technology,
  host_format_in_person,
  host_format_online,
} from '@founders-coffee/i18n';

export const AI_POLICY_LABELS = {
  disclosed: {
    name: hackathon_details_ai_disclosed,
    hint: hackathon_details_ai_disclosed_hint,
  },
  conditional: {
    name: hackathon_details_ai_conditional,
    hint: hackathon_details_ai_conditional_hint,
  },
  not_allowed: {
    name: hackathon_details_ai_not_allowed,
    hint: hackathon_details_ai_not_allowed_hint,
  },
} as const satisfies Record<HackathonAiPolicy, unknown>;

export const ATTENDANCE_LABELS = {
  in_person: host_format_in_person,
  online: host_format_online,
} as const satisfies Record<AttendanceMode, unknown>;

export const TRACK_KIND_LABELS = {
  founder_problem: hackathon_track_kind_founder_problem,
  partner_technology: hackathon_track_kind_partner_technology,
  open_source: hackathon_track_kind_open_source,
} as const satisfies Record<HackathonTrackKind, unknown>;
