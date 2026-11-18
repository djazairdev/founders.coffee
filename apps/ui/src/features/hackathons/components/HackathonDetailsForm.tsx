import {
  hackathon_details_licence,
  hackathon_details_licence_ph,
  hackathon_details_locked_notice,
  hackathon_details_save,
  hackathon_details_saving,
  hackathon_manage_deadlines_heading,
  hackathon_manage_deadlines_sub,
  hackathon_manage_teams_heading,
  hackathon_manage_teams_sub,
  type Locale,
} from '@founders-coffee/i18n';
import { StatusMessage } from '@founders-coffee/ui';

import type { HackathonDraftView } from '../api';
import type { HackathonFeedback } from '../hackathon-feedback';
import {
  useHackathonDeadlinesForm,
  useHackathonSettingsForm,
} from '../useHackathonDetailsForm';
import { HackathonAiPolicyFields } from './HackathonAiPolicyFields';
import { HackathonManageCollapse } from './HackathonManageCollapse';
import { HackathonNoteField } from './HackathonNoteField';
import { HackathonParticipationFields } from './HackathonParticipationFields';
import { HackathonSaveButton } from './HackathonSaveButton';
import { HackathonTimelineFields } from './HackathonTimelineFields';

export const HackathonDetailsForm = ({
  draft,
  locale,
  timeZone,
  timeZoneName,
  utcOffset,
  onFeedback,
}: {
  draft: HackathonDraftView;
  locale: Locale;
  timeZone: string;
  timeZoneName: string;
  utcOffset: string;
  onFeedback: HackathonFeedback;
}) => {
  const deadlinesForm = useHackathonDeadlinesForm({
    draft,
    timeZone,
    locale,
    onFeedback,
  });
  const settingsForm = useHackathonSettingsForm({
    draft,
    timeZone,
    locale,
    onFeedback,
  });
  return (
    <div className="grid">
      <form
        noValidate
        className="has-[.hackathon-date-calendar-panel]:relative has-[.hackathon-date-calendar-panel]:z-50"
        onSubmit={(event) => {
          event.preventDefault();
          deadlinesForm.submit();
        }}
      >
        <HackathonManageCollapse
          title={hackathon_manage_deadlines_heading({}, { locale })}
          description={hackathon_manage_deadlines_sub({}, { locale })}
          isInitiallyOpen
        >
          <HackathonTimelineFields
            form={deadlinesForm}
            locale={locale}
            timeZone={timeZone}
            timeZoneName={timeZoneName}
            utcOffset={utcOffset}
          />
          <div>
            <HackathonSaveButton type="submit" isBusy={deadlinesForm.isSaving}>
              {deadlinesForm.isSaving
                ? hackathon_details_saving({}, { locale })
                : hackathon_details_save({}, { locale })}
            </HackathonSaveButton>
          </div>
        </HackathonManageCollapse>
      </form>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          settingsForm.submit();
        }}
      >
        <HackathonManageCollapse
          title={hackathon_manage_teams_heading({}, { locale })}
          description={hackathon_manage_teams_sub({}, { locale })}
        >
          {draft.stage === 'locked' ? (
            <StatusMessage variant="info">
              {hackathon_details_locked_notice({}, { locale })}
            </StatusMessage>
          ) : null}
          <HackathonParticipationFields form={settingsForm} locale={locale} />
          <HackathonAiPolicyFields form={settingsForm} locale={locale} />
          <HackathonNoteField
            form={settingsForm}
            field="licenceNote"
            label={hackathon_details_licence({}, { locale })}
            placeholder={hackathon_details_licence_ph({}, { locale })}
            locale={locale}
          />
          <div>
            <HackathonSaveButton type="submit" isBusy={settingsForm.isSaving}>
              {settingsForm.isSaving
                ? hackathon_details_saving({}, { locale })
                : hackathon_details_save({}, { locale })}
            </HackathonSaveButton>
          </div>
        </HackathonManageCollapse>
      </form>
    </div>
  );
};
