import {
  hackathon_judging_closed,
  hackathon_judging_not_judge,
  hackathon_judging_not_started,
  type Locale,
} from '@founders-coffee/i18n';
import { StatusMessage } from '@founders-coffee/ui';

import type { JudgePageView } from '../api';
import { scheduleMoment } from '../schedule';

export const HackathonJudgingNotice = ({
  view,
  locale,
  timeZone,
}: {
  view: Pick<JudgePageView, 'isJudge' | 'stage' | 'submissionDeadlineAt'>;
  locale: Locale;
  timeZone: string;
}) => {
  const options = { locale };
  if (!view.isJudge)
    return (
      <StatusMessage variant="info" className="mt-6">
        {hackathon_judging_not_judge({}, options)}
      </StatusMessage>
    );
  if (view.stage === 'closed')
    return (
      <StatusMessage variant="info" className="mt-6">
        {hackathon_judging_closed({}, options)}
      </StatusMessage>
    );
  return (
    <p className="mt-3 text-body-sm text-neutral">
      {hackathon_judging_not_started(
        { date: scheduleMoment(view.submissionDeadlineAt, locale, timeZone) },
        options,
      )}
    </p>
  );
};
