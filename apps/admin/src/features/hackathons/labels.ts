import type {
  AttendanceMode,
  EventFormat,
  HackathonAiPolicy,
  HackathonTrackKind,
} from '@founders-coffee/core';
import {
  hackathon_details_ai_disclosed,
  hackathon_details_ai_native,
  hackathon_details_ai_restricted,
  hackathon_track_kind_founder_problem,
  hackathon_track_kind_open_source,
  hackathon_track_kind_partner_technology,
  host_format_hybrid,
  host_format_in_person,
  host_format_online,
  isSpokenLanguageCode,
  spokenLanguageName,
  type Locale,
} from '@founders-coffee/i18n';

type Message = typeof host_format_online;

const FORMATS: Record<EventFormat, Message> = {
  in_person: host_format_in_person,
  online: host_format_online,
  hybrid: host_format_hybrid,
};

const MODES: Record<AttendanceMode, Message> = {
  in_person: host_format_in_person,
  online: host_format_online,
};

const POLICIES: Record<HackathonAiPolicy, Message> = {
  disclosed: hackathon_details_ai_disclosed,
  ai_native: hackathon_details_ai_native,
  restricted: hackathon_details_ai_restricted,
};

const TRACK_KINDS: Record<HackathonTrackKind, Message> = {
  founder_problem: hackathon_track_kind_founder_problem,
  partner_technology: hackathon_track_kind_partner_technology,
  open_source: hackathon_track_kind_open_source,
};

/** How a hackathon is held, in the operator's language. */
export const formatLabel = (format: EventFormat, locale: Locale): string =>
  FORMATS[format]({}, { locale });

/** One way participants take part, in the operator's language. */
export const attendanceLabel = (mode: AttendanceMode, locale: Locale): string =>
  MODES[mode]({}, { locale });

/** A hackathon's AI policy, in the operator's language. */
export const aiPolicyLabel = (
  policy: HackathonAiPolicy,
  locale: Locale,
): string => POLICIES[policy]({}, { locale });

/** The kind of a track, in the operator's language. */
export const trackKindLabel = (
  kind: HackathonTrackKind,
  locale: Locale,
): string => TRACK_KINDS[kind]({}, { locale });

/** A language the hackathon is held in, named in the operator's language, or its code if unknown. */
export const languageLabel = (code: string, locale: Locale): string =>
  isSpokenLanguageCode(code) ? spokenLanguageName(code, locale) : code;
