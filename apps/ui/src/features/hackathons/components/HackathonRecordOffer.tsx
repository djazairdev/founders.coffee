import {
  hackathon_record_offer_failed,
  hackathon_record_offer_heading,
  hackathon_record_offer_hide,
  hackathon_record_offer_note,
  hackathon_record_offer_show,
  hackathon_record_offer_shown,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, StatusMessage } from '@founders-coffee/ui';

import { useSetRecordShown } from '../team-hooks';

export const HackathonRecordOffer = ({
  eventId,
  isShown,
  locale,
}: {
  eventId: string;
  isShown: boolean;
  locale: Locale;
}) => {
  const options = { locale };
  const change = useSetRecordShown(eventId);
  return (
    <section aria-labelledby="hackathon-record-offer-heading" className="mt-6">
      <h2 id="hackathon-record-offer-heading" className="font-display text-h4">
        {hackathon_record_offer_heading({}, options)}
      </h2>
      <p className="mt-1 text-body-sm text-neutral">
        {isShown
          ? hackathon_record_offer_shown({}, options)
          : hackathon_record_offer_note({}, options)}
      </p>
      <Button
        variant={isShown ? 'outline' : 'primary'}
        className="mt-3"
        isBusy={change.isPending}
        onClick={() => change.mutate(!isShown)}
      >
        {isShown
          ? hackathon_record_offer_hide({}, options)
          : hackathon_record_offer_show({}, options)}
      </Button>
      {change.isError ? (
        <StatusMessage variant="error" className="mt-2">
          {hackathon_record_offer_failed({}, options)}
        </StatusMessage>
      ) : null}
    </section>
  );
};
