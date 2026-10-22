import { Check, Circle } from 'lucide-react';

import {
  hackathon_review_done,
  hackathon_review_heading,
  hackathon_review_hint,
  hackathon_review_need_details,
  hackathon_review_need_rubric,
  hackathon_review_need_tracks,
  hackathon_review_submit,
  hackathon_review_submitting,
  hackathon_review_todo,
  hackathon_review_unready,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, StatusMessage } from '@founders-coffee/ui';

import type { HackathonDraftView } from '../api';
import { hackathonEditError } from '../edit-errors';
import { READINESS_ITEMS } from '../review-items';
import { useSubmitHackathonForReview } from '../hooks';
import { HackathonReviewSummary } from './HackathonReviewSummary';

const HEADING_ID = 'hackathon-review-heading';
const UNREADY_ID = 'hackathon-review-unready';

const ITEMS = {
  details: [hackathon_review_need_details, 'hackathon-details-heading'],
  tracks: [hackathon_review_need_tracks, 'hackathon-tracks-heading'],
  rubric: [hackathon_review_need_rubric, 'hackathon-rubric-heading'],
} as const;

const Checklist = ({
  draft,
  locale,
}: {
  draft: HackathonDraftView;
  locale: Locale;
}) => (
  <ul className="grid gap-2">
    {READINESS_ITEMS.map((gap) => {
      const [label, target] = ITEMS[gap];
      const isMissing = draft.review.gaps.includes(gap);
      return (
        <li key={gap} className="flex items-center gap-2 text-body-sm">
          {isMissing ? (
            <Circle aria-hidden="true" className="size-4 text-neutral" />
          ) : (
            <Check aria-hidden="true" className="size-4 text-success" />
          )}
          <span className="sr-only">
            {isMissing
              ? hackathon_review_todo({}, { locale })
              : hackathon_review_done({}, { locale })}
          </span>
          {isMissing ? (
            <a href={`#${target}`} className="link">
              {label({}, { locale })}
            </a>
          ) : (
            <span>{label({}, { locale })}</span>
          )}
        </li>
      );
    })}
  </ul>
);

export const HackathonReviewSection = ({
  draft,
  locale,
  timeZone,
}: {
  draft: HackathonDraftView;
  locale: Locale;
  timeZone: string;
}) => {
  const submit = useSubmitHackathonForReview();
  const { review } = draft;
  if (draft.event.status !== 'draft' || review.status === 'approved')
    return null;
  const isReady = review.gaps.length === 0;

  return (
    <section aria-labelledby={HEADING_ID} className="mt-12">
      <h2 id={HEADING_ID} className="font-display text-h4">
        {hackathon_review_heading({}, { locale })}
      </h2>
      {review.status === 'submitted' ? (
        <div className="mt-4">
          <HackathonReviewSummary
            draft={draft}
            locale={locale}
            timeZone={timeZone}
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-4">
          <p className="text-body-sm text-neutral">
            {hackathon_review_hint({}, { locale })}
          </p>
          <Checklist draft={draft} locale={locale} />
          <HackathonReviewSummary
            draft={draft}
            locale={locale}
            timeZone={timeZone}
          />
          {submit.isError ? (
            <StatusMessage variant="error">
              {hackathonEditError(submit.error, locale)}
            </StatusMessage>
          ) : null}
          <div className="grid gap-2">
            <div>
              <Button
                variant="primary"
                disabled={!isReady || submit.isPending}
                aria-describedby={isReady ? undefined : UNREADY_ID}
                onClick={() =>
                  submit.mutate({
                    eventId: draft.event.id,
                    version: draft.version,
                  })
                }
              >
                {submit.isPending
                  ? hackathon_review_submitting({}, { locale })
                  : hackathon_review_submit({}, { locale })}
              </Button>
            </div>
            {isReady ? null : (
              <p id={UNREADY_ID} className="text-caption text-neutral">
                {hackathon_review_unready({}, { locale })}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
