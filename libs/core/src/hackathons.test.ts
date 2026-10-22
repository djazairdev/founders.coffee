import { describe, expect, it } from 'vitest';

import {
  ATTENDANCE_MODES,
  attendanceModeSchema,
  EVENT_FORMATS,
  HACKATHON_AI_POLICIES,
  hackathonAiPolicySchema,
  eventFormatSchema,
  HACKATHON_PHASES,
  hackathonPhaseSchema,
  HACKATHON_REGISTRATION_STATUSES,
  hackathonRegistrationStatusSchema,
  HACKATHON_TEAM_REQUEST_STATUSES,
  hackathonTeamRequestStatusSchema,
  REGISTRATION_STATUSES,
  registrationStatusSchema,
} from './hackathons.js';

describe('hackathon contracts', () => {
  it.each([
    [HACKATHON_PHASES, hackathonPhaseSchema],
    [EVENT_FORMATS, eventFormatSchema],
    [ATTENDANCE_MODES, attendanceModeSchema],
    [REGISTRATION_STATUSES, registrationStatusSchema],
    [HACKATHON_REGISTRATION_STATUSES, hackathonRegistrationStatusSchema],
    [HACKATHON_AI_POLICIES, hackathonAiPolicySchema],
    [HACKATHON_TEAM_REQUEST_STATUSES, hackathonTeamRequestStatusSchema],
  ] as const)('accepts exactly %j', (values, schema) => {
    for (const value of values)
      expect(schema.safeParse(value).success).toBe(true);
    expect(schema.safeParse('unknown').success).toBe(false);
  });
});
