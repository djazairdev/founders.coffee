import type { HackathonReviewStatus } from '@founders-coffee/core';
import {
  hackathon_dashboard_review_approved,
  hackathon_dashboard_review_draft,
  hackathon_dashboard_review_rejected,
  hackathon_dashboard_review_submitted,
  type Locale,
} from '@founders-coffee/i18n';

/** Where a hackathon stands with the reviewers, as its organisers' overview says it (B-OPS-01). */
export const reviewStatusLabel = (
  status: HackathonReviewStatus,
  locale: Locale,
): string => {
  const options = { locale };
  switch (status) {
    case 'draft':
      return hackathon_dashboard_review_draft({}, options);
    case 'submitted':
      return hackathon_dashboard_review_submitted({}, options);
    case 'approved':
      return hackathon_dashboard_review_approved({}, options);
    case 'rejected':
      return hackathon_dashboard_review_rejected({}, options);
  }
};
