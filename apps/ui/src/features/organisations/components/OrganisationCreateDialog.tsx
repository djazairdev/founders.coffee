import { useState } from 'react';

import { org_apply_title, type Locale } from '@founders-coffee/i18n';

import type { OrganisationView } from '../api';
import { OrganisationApplyForm } from './OrganisationApplyForm';
import { OrganisationDialog } from './OrganisationDialog';

export const OrganisationCreateDialog = ({
  isOpen,
  locale,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  locale: Locale;
  onClose: () => void;
  onCreated: (organisation: Pick<OrganisationView, 'name' | 'slug'>) => void;
}) => {
  const [formVersion, setFormVersion] = useState(0);
  return (
    <OrganisationDialog
      isOpen={isOpen}
      locale={locale}
      onRequestClose={onClose}
      title={org_apply_title({}, { locale })}
    >
      <OrganisationApplyForm
        key={formVersion}
        locale={locale}
        onSent={(organisation) => {
          setFormVersion((version) => version + 1);
          onCreated(organisation);
        }}
      />
    </OrganisationDialog>
  );
};
