import {
  event_cancelled_body,
  event_cancelled_title,
  ntf_cancel_reason,
  type Locale,
} from '@founders-coffee/i18n';
import { IsolatedValue, StatusMessage } from '@founders-coffee/ui';

export const EventCancelledNotice = ({
  reason,
  locale,
}: {
  reason: string | null;
  locale: Locale;
}) => (
  <StatusMessage variant="error" className="mb-4">
    <p className="font-display text-h4 font-semibold">
      {event_cancelled_title({}, { locale })}
    </p>
    <p className="mt-1 text-neutral">{event_cancelled_body({}, { locale })}</p>
    {reason ? (
      <p className="mt-2 text-base-content">
        <IsolatedValue
          value={reason}
          message={(value) => ntf_cancel_reason({ reason: value }, { locale })}
        />
      </p>
    ) : null}
  </StatusMessage>
);
