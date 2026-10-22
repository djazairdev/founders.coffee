import {
  hackathon_banner_approved,
  hackathon_banner_draft,
  hackathon_review_note,
  hackathon_review_rejected,
  hackathon_review_submitted,
  type Locale,
} from '@founders-coffee/i18n';
import { StatusMessage } from '@founders-coffee/ui';

import type { HackathonDraftView } from '../api';

export const HackathonReviewBanner = ({
  draft,
  locale,
}: {
  draft: HackathonDraftView;
  locale: Locale;
}) => {
  const options = { locale };
  const { review } = draft;
  if (draft.event.status === 'published')
    return (
      <StatusMessage variant="success" className="mt-6">
        {hackathon_banner_approved({}, options)}
      </StatusMessage>
    );
  if (draft.event.status !== 'draft') return null;
  if (review.status === 'submitted')
    return (
      <StatusMessage variant="info" className="mt-6">
        {hackathon_review_submitted({}, options)}
      </StatusMessage>
    );
  if (review.status === 'rejected')
    return (
      <div className="mt-6 grid gap-2">
        <StatusMessage variant="warning">
          {hackathon_review_rejected({}, options)}
        </StatusMessage>
        {review.note ? (
          <div className="rounded-box bg-base-200 p-3 text-body-sm">
            <p className="text-caption text-neutral">
              {hackathon_review_note({}, options)}
            </p>
            <p className="whitespace-pre-line">
              <bdi>{review.note}</bdi>
            </p>
          </div>
        ) : null}
      </div>
    );
  return review.status === 'draft' && draft.isEditable ? (
    <StatusMessage variant="info" className="mt-6">
      {hackathon_banner_draft({}, options)}
    </StatusMessage>
  ) : null;
};
