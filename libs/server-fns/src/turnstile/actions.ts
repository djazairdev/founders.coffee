export const TURNSTILE_ACTIONS = {
  joinWaitlist: 'join_waitlist',
  joinHackathonInterest: 'join_hackathon_interest',
} as const;

export type TurnstileAction =
  (typeof TURNSTILE_ACTIONS)[keyof typeof TURNSTILE_ACTIONS];
