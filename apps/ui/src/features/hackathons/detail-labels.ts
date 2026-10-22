import type { AttendanceMode, HackathonAiPolicy } from '@founders-coffee/core';
import {
  hackathon_details_ai_disclosed,
  hackathon_details_ai_disclosed_hint,
  hackathon_details_ai_native,
  hackathon_details_ai_native_hint,
  hackathon_details_ai_restricted,
  hackathon_details_ai_restricted_hint,
  host_format_in_person,
  host_format_online,
} from '@founders-coffee/i18n';

export const AI_POLICY_LABELS = {
  disclosed: {
    name: hackathon_details_ai_disclosed,
    hint: hackathon_details_ai_disclosed_hint,
  },
  ai_native: {
    name: hackathon_details_ai_native,
    hint: hackathon_details_ai_native_hint,
  },
  restricted: {
    name: hackathon_details_ai_restricted,
    hint: hackathon_details_ai_restricted_hint,
  },
} as const satisfies Record<HackathonAiPolicy, unknown>;

export const ATTENDANCE_LABELS = {
  in_person: host_format_in_person,
  online: host_format_online,
} as const satisfies Record<AttendanceMode, unknown>;
