import type { ToastMessage } from '@founders-coffee/ui';

export type HackathonFeedback = (
  message: string,
  variant: ToastMessage['variant'],
) => void;
