import {
  org_status_applied_on,
  org_status_approved,
  org_status_approved_on,
  org_status_note_label,
  org_status_pending,
  org_status_pending_body,
  org_status_rejected,
  org_status_rejected_body,
  org_status_rejected_on,
  org_status_suspended,
  org_status_suspended_body,
  org_status_suspended_on,
  type Locale,
} from '@founders-coffee/i18n';

import { rosterDate } from '../roster-labels';
import type { OrganisationReviewView } from '../types';

const BADGE_CLASS = {
  pending: 'badge-warning',
  approved: 'badge-success',
  rejected: 'badge-error',
  suspended: 'badge-error',
} as const;

const statusName = (review: OrganisationReviewView, locale: Locale) => {
  switch (review.status) {
    case 'pending':
      return org_status_pending({}, { locale });
    case 'approved':
      return org_status_approved({}, { locale });
    case 'rejected':
      return org_status_rejected({}, { locale });
    case 'suspended':
      return org_status_suspended({}, { locale });
  }
};

const datedLine = (
  review: OrganisationReviewView,
  locale: Locale,
  timeZone: string,
): string | null => {
  const day = (date: Date) => rosterDate(date, locale, timeZone);
  switch (review.status) {
    case 'pending':
      return org_status_applied_on({ date: day(review.appliedAt) }, { locale });
    case 'approved':
      return review.approvedAt
        ? org_status_approved_on({ date: day(review.approvedAt) }, { locale })
        : null;
    case 'rejected':
      return review.reviewedAt
        ? org_status_rejected_on({ date: day(review.reviewedAt) }, { locale })
        : null;
    case 'suspended':
      return review.reviewedAt
        ? org_status_suspended_on({ date: day(review.reviewedAt) }, { locale })
        : null;
  }
};

const explanation = (review: OrganisationReviewView, locale: Locale) => {
  switch (review.status) {
    case 'pending':
      return org_status_pending_body({}, { locale });
    case 'rejected':
      return org_status_rejected_body({}, { locale });
    case 'suspended':
      return org_status_suspended_body({}, { locale });
    case 'approved':
      return null;
  }
};

export const OrganisationReviewCard = ({
  review,
  locale,
  timeZone,
}: {
  review: OrganisationReviewView;
  locale: Locale;
  timeZone: string;
}) => {
  const dated = datedLine(review, locale, timeZone);
  const body = explanation(review, locale);
  return (
    <section className="rounded-box border border-base-300 bg-base-100 p-5 md:p-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={`badge badge-soft ${BADGE_CLASS[review.status]}`}>
          {statusName(review, locale)}
        </span>
        {dated ? (
          <span className="text-body-sm text-neutral">{dated}</span>
        ) : null}
      </div>
      {body ? <p className="mt-3 text-body-sm">{body}</p> : null}
      {review.status === 'rejected' && review.note ? (
        <div className="mt-3">
          <p className="text-label">{org_status_note_label({}, { locale })}</p>
          <p className="mt-1 whitespace-pre-line text-body-sm">
            <bdi>{review.note}</bdi>
          </p>
        </div>
      ) : null}
    </section>
  );
};
