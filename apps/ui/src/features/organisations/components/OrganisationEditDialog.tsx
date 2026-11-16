import { useState } from 'react';

import {
  org_profile_edit_title,
  profile_unsaved_leave,
  profile_unsaved_stay,
  unsaved_changes,
  type Locale,
} from '@founders-coffee/i18n';
import { Button } from '@founders-coffee/ui';

import type { OrganisationView } from '../api';
import { OrganisationProfileForm } from './OrganisationProfileForm';
import { OrganisationDialog } from './OrganisationDialog';

export const OrganisationEditDialog = ({
  isOpen,
  locale,
  organisation,
  canUpload,
  isNavigationBlocked,
  onClose,
  onDirtyChange,
  onStay,
  onLeave,
}: {
  isOpen: boolean;
  locale: Locale;
  organisation: OrganisationView;
  canUpload: boolean;
  isNavigationBlocked: boolean;
  onClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onStay: () => void;
  onLeave: () => void;
}) => {
  const [isDirty, setIsDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const requestClose = () => {
    if (isDirty) setConfirmDiscard(true);
    else onClose();
  };
  const stay = () => {
    setConfirmDiscard(false);
    onStay();
  };
  const discard = () => {
    setConfirmDiscard(false);
    onDirtyChange(false);
    onClose();
  };

  return (
    <OrganisationDialog
      isOpen={isOpen}
      locale={locale}
      onRequestClose={requestClose}
      title={org_profile_edit_title({}, { locale })}
    >
      {isNavigationBlocked || confirmDiscard ? (
        <section
          role="alertdialog"
          aria-label={unsaved_changes({}, { locale })}
          className="rounded-box border border-base-300 bg-base-200 p-4"
        >
          <p>{unsaved_changes({}, { locale })}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={stay}>
              {profile_unsaved_stay({}, { locale })}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={isNavigationBlocked ? onLeave : discard}
            >
              {profile_unsaved_leave({}, { locale })}
            </Button>
          </div>
        </section>
      ) : (
        <OrganisationProfileForm
          key={organisation.id}
          organisation={organisation}
          locale={locale}
          canUpload={canUpload}
          onDirtyChange={(dirty) => {
            setIsDirty(dirty);
            onDirtyChange(dirty);
          }}
        />
      )}
    </OrganisationDialog>
  );
};
