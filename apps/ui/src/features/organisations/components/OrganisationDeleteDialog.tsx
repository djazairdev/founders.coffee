import { useState } from 'react';

import { appErrorCode } from '@founders-coffee/core';
import {
  cancel,
  org_profile_delete_body,
  org_profile_delete_confirm,
  org_profile_delete_error,
  org_profile_delete_has_events,
  org_profile_delete_title,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, StatusMessage } from '@founders-coffee/ui';

import type { OrganisationView } from '../api';
import { useDeleteOrganisation } from '../hooks';
import { OrganisationDialog } from './OrganisationDialog';

export const OrganisationDeleteDialog = ({
  isOpen,
  locale,
  onClose,
  onDeleted,
  organisation,
}: {
  isOpen: boolean;
  locale: Locale;
  onClose: () => void;
  onDeleted: () => void;
  organisation: OrganisationView;
}) => {
  const options = { locale };
  const deletion = useDeleteOrganisation();
  const [problem, setProblem] = useState<'has_events' | 'failed' | null>(null);

  const confirmDelete = async () => {
    setProblem(null);
    try {
      await deletion.mutateAsync(organisation.id);
      onDeleted();
    } catch (error) {
      setProblem(
        appErrorCode(error) === 'organisation_has_events'
          ? 'has_events'
          : 'failed',
      );
    }
  };

  return (
    <OrganisationDialog
      isOpen={isOpen}
      locale={locale}
      onRequestClose={() => {
        if (!deletion.isPending) onClose();
      }}
      title={org_profile_delete_title({}, options)}
    >
      <p className="text-body-sm leading-relaxed text-neutral">
        {org_profile_delete_body({ name: organisation.name }, options)}
      </p>
      {problem ? (
        <div className="mt-4">
          <StatusMessage variant="error">
            {problem === 'has_events'
              ? org_profile_delete_has_events({}, options)
              : org_profile_delete_error({}, options)}
          </StatusMessage>
        </div>
      ) : null}
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="ghost"
          disabled={deletion.isPending}
          onClick={onClose}
        >
          {cancel({}, options)}
        </Button>
        <Button
          className="btn-error"
          disabled={deletion.isPending}
          isBusy={deletion.isPending}
          onClick={() => void confirmDelete()}
        >
          {org_profile_delete_confirm({}, options)}
        </Button>
      </div>
    </OrganisationDialog>
  );
};
