import {
  formatNumber,
  hackathon_judges_progress_already,
  hackathon_judges_progress_done,
  hackathon_judges_progress_empty,
  hackathon_judges_progress_error,
  hackathon_judges_progress_heading,
  hackathon_judges_progress_loading,
  hackathon_judges_progress_missing,
  hackathon_judges_progress_recused,
  hackathon_judges_progress_remind,
  hackathon_judges_progress_remind_hint,
  hackathon_judges_progress_reminded,
  hackathon_judges_progress_reminding,
  hackathon_judging_empty,
  hackathon_judging_progress,
  retry,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, LoadingStatus, StatusMessage } from '@founders-coffee/ui';

import type { JudgingProgressJudge } from '../api';
import { judgingErrorMessage } from '../judging-errors';
import {
  useHackathonJudgingProgress,
  useRemindHackathonJudges,
} from '../results-hooks';

const HEADING_ID = 'hackathon-judging-progress-heading';

const JudgeRow = ({
  judge,
  locale,
}: {
  judge: JudgingProgressJudge;
  locale: Locale;
}) => {
  const options = { locale };
  const number = (value: number) => formatNumber(value, locale);
  const { scored, toScore, recused } = judge.progress;
  return (
    <li className="flex flex-wrap items-start justify-between gap-2 p-3">
      <div className="grid min-w-0 gap-1">
        <p className="font-medium">
          <bdi className="break-words">{judge.name}</bdi>
        </p>
        <p className="text-body-sm text-neutral">
          {hackathon_judging_progress(
            { scored: number(scored), total: number(scored + toScore) },
            options,
          )}
        </p>
        {recused > 0 ? (
          <p className="text-caption text-neutral">
            {hackathon_judges_progress_recused(
              { count: number(recused) },
              options,
            )}
          </p>
        ) : null}
      </div>
      {toScore > 0 ? (
        <span className="badge badge-sm badge-soft badge-warning">
          {hackathon_judges_progress_missing(
            { count: number(toScore) },
            options,
          )}
        </span>
      ) : (
        <span className="badge badge-sm badge-soft badge-success">
          {hackathon_judges_progress_done({}, options)}
        </span>
      )}
    </li>
  );
};

export const HackathonJudgingProgress = ({
  eventId,
  locale,
}: {
  eventId: string;
  locale: Locale;
}) => {
  const options = { locale };
  const query = useHackathonJudgingProgress(eventId);
  const remind = useRemindHackathonJudges(eventId);
  const view = query.data;
  if (view?.stage === 'not_started') return null;
  const canRemind =
    view?.stage === 'judging' &&
    view.judges.some((judge) => judge.progress.toScore > 0);
  const sent = remind.data;
  return (
    <section aria-labelledby={HEADING_ID} className="mt-8">
      <h2 id={HEADING_ID} className="font-display text-h4">
        {hackathon_judges_progress_heading({}, options)}
      </h2>
      {!view ? (
        query.isError ? (
          <StatusMessage
            variant="error"
            className="mt-3"
            action={
              <Button variant="outline" onClick={() => void query.refetch()}>
                {retry({}, options)}
              </Button>
            }
          >
            {hackathon_judges_progress_error({}, options)}
          </StatusMessage>
        ) : (
          <LoadingStatus
            className="mt-3"
            label={hackathon_judges_progress_loading({}, options)}
          />
        )
      ) : view.judges.length === 0 ? (
        <p className="mt-2 text-body-sm text-neutral">
          {hackathon_judges_progress_empty({}, options)}
        </p>
      ) : view.entries === 0 ? (
        <p className="mt-2 text-body-sm text-neutral">
          {hackathon_judging_empty({}, options)}
        </p>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-base-300 rounded-box border border-base-300">
            {view.judges.map((judge) => (
              <JudgeRow key={judge.judgeId} judge={judge} locale={locale} />
            ))}
          </ul>
          {canRemind ? (
            <div className="mt-3 grid gap-2">
              <p className="text-body-sm text-neutral">
                {hackathon_judges_progress_remind_hint({}, options)}
              </p>
              {remind.error ? (
                <StatusMessage variant="error">
                  {judgingErrorMessage(remind.error, locale)}
                </StatusMessage>
              ) : null}
              {sent && sent.reminded > 0 ? (
                <StatusMessage variant="success">
                  {hackathon_judges_progress_reminded(
                    { count: formatNumber(sent.reminded, locale) },
                    options,
                  )}
                </StatusMessage>
              ) : sent ? (
                <StatusMessage variant="info">
                  {hackathon_judges_progress_already({}, options)}
                </StatusMessage>
              ) : null}
              <div>
                <Button
                  variant="outline"
                  isBusy={remind.isPending}
                  onClick={() => remind.mutate()}
                >
                  {remind.isPending
                    ? hackathon_judges_progress_reminding({}, options)
                    : hackathon_judges_progress_remind({}, options)}
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
};
