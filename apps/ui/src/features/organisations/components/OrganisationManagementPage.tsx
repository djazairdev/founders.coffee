import { Plus } from 'lucide-react';
import { useCallback, useState } from 'react';

import {
  org_manage_error,
  org_manage_loading,
  org_profile_create,
  profile_organisations_title,
  retry,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, LoadingStatus, StatusMessage } from '@founders-coffee/ui';

import { ProfileSectionNav } from '../../account/components/ProfileSectionNav';
import { usePhotoUploadAvailability } from '../../profile/hooks';
import { useUnsavedGuard } from '../../profile/useUnsavedGuard';
import { OrganisationCreateDialog } from './OrganisationCreateDialog';
import { OrganisationEditDialog } from './OrganisationEditDialog';
import { OrganisationDeleteDialog } from './OrganisationDeleteDialog';
import { OrganisationListTable } from './OrganisationListTable';
import { OrganisationProfileEmpty } from './OrganisationProfileEmpty';
import { useMyOrganisations } from '../hooks';
import type { OrganisationView } from '../api';

export const OrganisationManagementPage = ({ locale }: { locale: Locale }) => {
  const query = useMyOrganisations(true);
  const photos = usePhotoUploadAvailability();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<OrganisationView | null>(null);
  const [deleting, setDeleting] = useState<OrganisationView | null>(null);
  const [isEditDirty, setIsEditDirty] = useState(false);
  const guard = useUnsavedGuard(isEditDirty);
  const startEditing = useCallback(
    (organisation: OrganisationView) => setEditing(organisation),
    [],
  );
  const options = { locale };

  return (
    <section className="mx-auto max-w-5xl px-5 py-12 lg:grid lg:grid-cols-[184px_minmax(0,1fr)] lg:gap-12">
      <ProfileSectionNav locale={locale} />
      <div className="min-w-0">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <h1 className="font-display text-h3">
            {profile_organisations_title({}, options)}
          </h1>
          {query.data && query.data.length > 0 ? (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              {org_profile_create({}, options)}
            </Button>
          ) : null}
        </header>
        {query.isPending ? (
          <LoadingStatus label={org_manage_loading({}, options)} />
        ) : query.isError ? (
          <StatusMessage
            variant="error"
            action={
              <Button variant="outline" onClick={() => void query.refetch()}>
                {retry({}, options)}
              </Button>
            }
          >
            {org_manage_error({}, options)}
          </StatusMessage>
        ) : query.data.length === 0 ? (
          <OrganisationProfileEmpty
            locale={locale}
            onCreate={() => setIsCreateOpen(true)}
          />
        ) : (
          <OrganisationListTable
            data={query.data}
            locale={locale}
            onEdit={startEditing}
            onDelete={setDeleting}
          />
        )}
      </div>
      <OrganisationCreateDialog
        isOpen={isCreateOpen}
        locale={locale}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => {
          setIsCreateOpen(false);
        }}
      />
      {editing ? (
        <OrganisationEditDialog
          isOpen
          locale={locale}
          organisation={editing}
          canUpload={photos.data?.enabled === true}
          isNavigationBlocked={guard.isBlocked}
          onClose={() => setEditing(null)}
          onDirtyChange={setIsEditDirty}
          onStay={guard.stay}
          onLeave={guard.leave}
        />
      ) : null}
      {deleting ? (
        <OrganisationDeleteDialog
          isOpen
          locale={locale}
          organisation={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => setDeleting(null)}
        />
      ) : null}
    </section>
  );
};
