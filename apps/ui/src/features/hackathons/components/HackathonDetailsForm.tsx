import {
  hackathon_details_licence,
  hackathon_details_licence_ph,
  hackathon_details_save,
  hackathon_details_saved,
  hackathon_details_saving,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, StatusMessage } from '@founders-coffee/ui';

import type { HackathonDraftView } from '../api';
import { offeredModes } from '../hackathon-details-form';
import { useHackathonDetailsForm } from '../useHackathonDetailsForm';
import { HackathonAiPolicyFields } from './HackathonAiPolicyFields';
import { HackathonNoteField } from './HackathonNoteField';
import { HackathonParticipationFields } from './HackathonParticipationFields';
import { HackathonTimelineFields } from './HackathonTimelineFields';

export const HackathonDetailsForm = ({
  draft,
  locale,
  timeZone,
  kickoff,
  demoDay,
}: {
  draft: HackathonDraftView;
  locale: Locale;
  timeZone: string;
  kickoff: string;
  demoDay: string;
}) => {
  const form = useHackathonDetailsForm({ draft, timeZone, locale });
  return (
    <form
      noValidate
      className="grid gap-8"
      onSubmit={(event) => {
        event.preventDefault();
        form.submit();
      }}
    >
      <HackathonTimelineFields
        form={form}
        locale={locale}
        kickoff={kickoff}
        demoDay={demoDay}
      />
      <HackathonParticipationFields
        form={form}
        locale={locale}
        offeredModes={offeredModes(draft.event.format)}
      />
      <HackathonAiPolicyFields form={form} locale={locale} />
      <HackathonNoteField
        form={form}
        field="licenceNote"
        label={hackathon_details_licence({}, { locale })}
        placeholder={hackathon_details_licence_ph({}, { locale })}
        locale={locale}
      />
      <div className="grid gap-3">
        {form.saveError ? (
          <StatusMessage variant="error">{form.saveError}</StatusMessage>
        ) : null}
        {form.isSaved ? (
          <StatusMessage variant="success">
            {hackathon_details_saved({}, { locale })}
          </StatusMessage>
        ) : null}
        <div>
          <Button type="submit" variant="primary" disabled={form.isSaving}>
            {form.isSaving
              ? hackathon_details_saving({}, { locale })
              : hackathon_details_save({}, { locale })}
          </Button>
        </div>
      </div>
    </form>
  );
};
