import {
  hackathon_team_not_found,
  retry,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, LoadingStatus, StatusMessage } from '@founders-coffee/ui';

import { isHackathonMissing, isHackathonsDisabled } from '../errors';
import { HackathonsUnavailable } from './HackathonsUnavailable';

export const HackathonParticipantQueryStatus = ({
  isError,
  error,
  onRetry,
  errorLabel,
  loadingLabel,
  locale,
}: {
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  errorLabel: string;
  loadingLabel: string;
  locale: Locale;
}) => {
  if (!isError) return <LoadingStatus className="mt-6" label={loadingLabel} />;
  if (isHackathonsDisabled(error))
    return (
      <div className="mt-6">
        <HackathonsUnavailable locale={locale} />
      </div>
    );
  if (isHackathonMissing(error))
    return (
      <StatusMessage variant="warning" className="mt-6">
        {hackathon_team_not_found({}, { locale })}
      </StatusMessage>
    );
  return (
    <StatusMessage
      variant="error"
      className="mt-6"
      action={
        <Button variant="outline" onClick={onRetry}>
          {retry({}, { locale })}
        </Button>
      }
    >
      {errorLabel}
    </StatusMessage>
  );
};
