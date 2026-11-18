export interface NotificationDueMessage {
  readonly kind: 'notification_due';
  readonly eventId: string;
}

export interface WaitlistLaunchDueMessage {
  readonly kind: 'waitlist_launch_due';
  readonly launchId: string;
  readonly eventId: string;
}

export interface HackathonInterestLaunchDueMessage {
  readonly kind: 'hackathon_interest_launch_due';
  readonly launchId: string;
  readonly eventId: string;
}

export interface HackathonResultsNoticesDueMessage {
  readonly kind: 'hackathon_results_notices_due';
  readonly eventId: string;
  readonly afterUserId: string | null;
}

export type AppQueueMessage =
  | NotificationDueMessage
  | WaitlistLaunchDueMessage
  | HackathonInterestLaunchDueMessage
  | HackathonResultsNoticesDueMessage;
