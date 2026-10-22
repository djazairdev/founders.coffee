import {
  hackathon_submission_submitted,
  hackathon_submission_submitted_final,
  type Locale,
} from '@founders-coffee/i18n';
import { StatusMessage } from '@founders-coffee/ui';

import { scheduleMoment } from '../schedule';

export const HackathonSubmissionSubmitted = ({
  submittedAt,
  isOpen,
  locale,
  timeZone,
}: {
  submittedAt: number;
  isOpen: boolean;
  locale: Locale;
  timeZone: string;
}) => {
  const date = scheduleMoment(submittedAt, locale, timeZone);
  return (
    <StatusMessage variant="success">
      {isOpen
        ? hackathon_submission_submitted({ date }, { locale })
        : hackathon_submission_submitted_final({ date }, { locale })}
    </StatusMessage>
  );
};
