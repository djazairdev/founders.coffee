import type { EventStatus } from '@founders-coffee/core';
import {
  org_hackathon_status_cancelled,
  org_hackathon_status_draft,
  org_hackathon_status_published,
  type Locale,
} from '@founders-coffee/i18n';

const STATUS_LABELS = {
  draft: org_hackathon_status_draft,
  published: org_hackathon_status_published,
  cancelled: org_hackathon_status_cancelled,
} as const;

/** What a hackathon's status reads as in the organisation's own list. */
export const hackathonStatusLabel = (
  status: EventStatus,
  locale: Locale,
): string => STATUS_LABELS[status]({}, { locale });
