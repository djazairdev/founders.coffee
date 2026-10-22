export interface RateBudget {
  readonly action: string;
  readonly limit: number;
  readonly windowMs: number;
}

export const MINUTE_MS = 60_000;
