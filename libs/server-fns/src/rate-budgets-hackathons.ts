import { MINUTE_MS, type RateBudget } from './rate-budget.js';

export const HACKATHON_RATE_BUDGETS = {
  hackathonRegister: {
    action: 'register_for_hackathon',
    limit: 10,
    windowMs: 10 * MINUTE_MS,
  },
  hackathonTeamCreate: {
    action: 'create_hackathon_team',
    limit: 5,
    windowMs: 10 * MINUTE_MS,
  },
  hackathonTeamInvite: {
    action: 'share_hackathon_team',
    limit: 10,
    windowMs: 10 * MINUTE_MS,
  },
  hackathonTeamJoin: {
    action: 'join_hackathon_team',
    limit: 10,
    windowMs: 10 * MINUTE_MS,
  },
  hackathonJudgeAnswer: {
    action: 'answer_hackathon_judge_invite',
    limit: 10,
    windowMs: 10 * MINUTE_MS,
  },
  hackathonMentorAnswer: {
    action: 'answer_hackathon_mentor_invite',
    limit: 10,
    windowMs: 10 * MINUTE_MS,
  },
  hackathonReport: {
    action: 'report_hackathon_target',
    limit: 10,
    windowMs: 10 * MINUTE_MS,
  },
  hackathonScoreSave: {
    action: 'save_hackathon_scores',
    limit: 60,
    windowMs: 10 * MINUTE_MS,
  },
  hackathonRecusal: {
    action: 'recuse_hackathon_entry',
    limit: 20,
    windowMs: 10 * MINUTE_MS,
  },
  hackathonMentorNote: {
    action: 'save_hackathon_mentor_note',
    limit: 20,
    windowMs: 10 * MINUTE_MS,
  },
  hackathonTeamRequest: {
    action: 'request_hackathon_team',
    limit: 10,
    windowMs: 10 * MINUTE_MS,
  },
  hackathonTeamRequestAnswer: {
    action: 'answer_hackathon_team_request',
    limit: 30,
    windowMs: 10 * MINUTE_MS,
  },
  hackathonTeamChange: {
    action: 'change_hackathon_team',
    limit: 20,
    windowMs: 10 * MINUTE_MS,
  },
  hackathonSubmissionSave: {
    action: 'save_hackathon_submission',
    limit: 60,
    windowMs: 10 * MINUTE_MS,
  },
  hackathonSubmissionSubmit: {
    action: 'submit_hackathon_submission',
    limit: 20,
    windowMs: 10 * MINUTE_MS,
  },
  hackathonEdit: {
    action: 'edit_hackathon',
    limit: 30,
    windowMs: 10 * MINUTE_MS,
  },
  hackathonDecision: {
    action: 'decide_hackathon',
    limit: 60,
    windowMs: 10 * MINUTE_MS,
  },
  hackathonReportDecision: {
    action: 'decide_hackathon_report',
    limit: 60,
    windowMs: 10 * MINUTE_MS,
  },
} as const satisfies Record<string, RateBudget>;
