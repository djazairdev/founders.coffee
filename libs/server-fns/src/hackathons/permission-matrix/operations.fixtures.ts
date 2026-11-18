import { JUDGING_OPERATIONS } from './judging.fixtures.js';
import type { Operations } from './matrix.fixtures.js';
import { ORGANISER_OPERATIONS } from './organiser.fixtures.js';
import { RESULTS_OPERATIONS } from './results.fixtures.js';
import { SUBMISSION_OPERATIONS } from './submissions.fixtures.js';
import { TEAM_OPERATIONS } from './teams.fixtures.js';

export const OPERATIONS: Operations = {
  ...TEAM_OPERATIONS,
  ...SUBMISSION_OPERATIONS,
  ...JUDGING_OPERATIONS,
  ...ORGANISER_OPERATIONS,
  ...RESULTS_OPERATIONS,
};

export const EXEMPT: Readonly<Record<string, string>> = {
  getProjectPage:
    'Public by design: a published project’s page is for anyone, signed in or not, and its slug is the only input. A draft or hidden project reads as not found.',
  getHackathonCertificatePage:
    'Public by design: whoever holds a certificate’s code reads what it proves, signed in or not, in every phase and after hackathons are switched off, because the certificate outlives both.',
  joinHackathonInterest:
    'Anonymous and gated by Turnstile: it takes an address and a market, with no session, no actor and no hackathon, so no cell of this table can reach it. interest.test.ts holds it.',
};
