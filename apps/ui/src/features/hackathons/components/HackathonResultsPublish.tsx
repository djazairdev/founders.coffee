import { useMemo, type FormEvent } from 'react';

import { HACKATHON_RESULTS_REASON_MAX } from '@founders-coffee/core';
import {
  formatNumber,
  hackathon_results_panel_missing,
  hackathon_results_panel_publish,
  hackathon_results_panel_publishing,
  hackathon_results_panel_reason,
  hackathon_results_panel_reason_needed,
  hackathon_results_panel_ties_heading,
  hackathon_results_panel_ties_hint,
  optional,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, FormField, StatusMessage } from '@founders-coffee/ui';

import type { HackathonResultsEntry, HackathonResultsView } from '../api';
import { resultsErrorMessage } from '../results-errors';
import {
  RESULTS_REASON_ID,
  useHackathonResultsForm,
} from '../useHackathonResultsForm';
import { HackathonResultsConfirmDialog } from './HackathonResultsConfirmDialog';
import { HackathonResultsTieGroup } from './HackathonResultsTieGroup';

export const HackathonResultsPublish = ({
  eventId,
  view,
  locale,
}: {
  eventId: string;
  view: HackathonResultsView;
  locale: Locale;
}) => {
  const options = { locale };
  const form = useHackathonResultsForm({ eventId, view });
  const entriesById = useMemo(
    () =>
      new Map<string, HackathonResultsEntry>(
        view.entries.map((entry) => [entry.submissionId, entry]),
      ),
    [view.entries],
  );
  const hasMissing = view.missingEntries.length > 0;
  const hasTies = form.order.length > 0;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    form.request();
  };
  return (
    <form noValidate onSubmit={submit} className="mt-6 grid gap-4">
      {hasTies ? (
        <div className="grid gap-2">
          <h3 className="font-medium">
            {hackathon_results_panel_ties_heading({}, options)}
          </h3>
          <p className="text-body-sm text-neutral">
            {hackathon_results_panel_ties_hint({}, options)}
          </p>
          {form.order.map((group, groupIndex) => (
            <HackathonResultsTieGroup
              key={[...group].sort().join()}
              entries={group.flatMap((entryId) => {
                const entry = entriesById.get(entryId);
                return entry ? [entry] : [];
              })}
              isDisabled={form.isPublishing}
              locale={locale}
              onMove={(index, delta) => form.move(groupIndex, index, delta)}
            />
          ))}
        </div>
      ) : null}
      {hasMissing ? (
        <div className="grid gap-2">
          <StatusMessage variant="warning">
            {hackathon_results_panel_missing(
              { count: formatNumber(view.missingEntries.length, locale) },
              options,
            )}
          </StatusMessage>
          <FormField
            id={RESULTS_REASON_ID}
            label={hackathon_results_panel_reason({}, options)}
            optionalLabel={optional({}, options)}
            error={
              form.isReasonMissing
                ? hackathon_results_panel_reason_needed({}, options)
                : null
            }
          >
            <textarea
              id={RESULTS_REASON_ID}
              className="textarea textarea-sm md:textarea-md w-full"
              rows={2}
              dir="auto"
              maxLength={HACKATHON_RESULTS_REASON_MAX}
              value={form.reason}
              readOnly={form.isPublishing}
              onChange={(event) => form.changeReason(event.target.value)}
            />
          </FormField>
        </div>
      ) : null}
      {form.error ? (
        <StatusMessage variant="error">
          {resultsErrorMessage(form.error, locale)}
        </StatusMessage>
      ) : null}
      <div>
        <Button type="submit" variant="primary" isBusy={form.isPublishing}>
          {form.isPublishing
            ? hackathon_results_panel_publishing({}, options)
            : hackathon_results_panel_publish({}, options)}
        </Button>
      </div>
      <HackathonResultsConfirmDialog
        isOpen={form.isConfirming}
        hasTies={hasTies}
        locale={locale}
        onKeep={form.keep}
        onConfirm={form.confirm}
      />
    </form>
  );
};
