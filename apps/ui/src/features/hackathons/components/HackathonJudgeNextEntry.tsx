import { Link } from '@tanstack/react-router';

import { hackathon_judging_next, type Locale } from '@founders-coffee/i18n';

import { localizedHackathonJudgeEntry } from '../../../lib/locale-routing';
import { useJudgePage } from '../judging-hooks';

export const HackathonJudgeNextEntry = ({
  eventId,
  submissionId,
  locale,
}: {
  eventId: string;
  submissionId: string;
  locale: Locale;
}) => {
  const next = useJudgePage(eventId).data?.entries.find(
    (entry) =>
      entry.state === 'to_score' && entry.submissionId !== submissionId,
  );
  if (!next) return null;
  return (
    <p className="mt-6 text-body-sm">
      <span className="text-neutral">
        {hackathon_judging_next({}, { locale })}:{' '}
      </span>
      <Link
        {...localizedHackathonJudgeEntry(locale, eventId, next.submissionId)}
        className="link font-medium"
      >
        <bdi>{next.title}</bdi>
      </Link>
    </p>
  );
};
