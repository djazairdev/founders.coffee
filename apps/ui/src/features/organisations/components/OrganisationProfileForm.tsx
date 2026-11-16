import { Save } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { appErrorCode } from '@founders-coffee/core';
import {
  org_apply_error_failed,
  org_apply_error_rate_limited,
  org_profile_logo,
  org_profile_logo_saved,
  org_profile_saved,
  profile_photo_card_subtitle,
  profile_photo_choose,
  profile_photo_replace,
  profile_photo_remove,
  profile_photo_uploading,
  save,
  saving,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, ImageUploadField, StatusMessage } from '@founders-coffee/ui';

import { photoErrorMessage } from '../../profile/errors';
import { initials } from '../../../lib/utils';
import type { OrganisationView } from '../api';
import { applicationFieldError } from '../errors';
import { useOrganisationLogo, useUpdateOrganisation } from '../hooks';
import { organisationDraftFrom, organisationEditFrom } from '../profile-edit';
import { OrganisationDetailsFields } from './OrganisationDetailsFields';

export const OrganisationProfileForm = ({
  organisation,
  locale,
  canUpload,
  onDirtyChange,
}: {
  organisation: OrganisationView;
  locale: Locale;
  canUpload: boolean;
  onDirtyChange: (dirty: boolean) => void;
}) => {
  const [base, setBase] = useState(() => organisationDraftFrom(organisation));
  const [draft, setDraft] = useState(base);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);
  const update = useUpdateOrganisation();
  const logo = useOrganisationLogo();
  const controls = useRef<
    Record<string, HTMLInputElement | HTMLTextAreaElement | null>
  >({});
  const report = useRef(onDirtyChange);
  report.current = onDirtyChange;
  const isDirty = JSON.stringify(draft) !== JSON.stringify(base);
  const isBusy = !organisation.canEdit || update.isPending || logo.isPending;
  useEffect(() => {
    report.current(isDirty);
    return () => report.current(false);
  }, [isDirty]);

  const failed = (error: unknown) =>
    setNotice({
      text:
        appErrorCode(error) === 'rate_limited'
          ? org_apply_error_rate_limited({}, { locale })
          : org_apply_error_failed({}, { locale }),
      isError: true,
    });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (isBusy) return;
    setNotice(null);
    const parsed = organisationEditFrom(draft);
    if (!parsed.success) {
      const field = String(parsed.error.issues[0]?.path[0] ?? 'name');
      setInvalid(field);
      controls.current[field]?.focus();
      return;
    }
    try {
      const saved = await update.mutateAsync({
        organisationId: organisation.id,
        changes: parsed.data,
      });
      const next = organisationDraftFrom(saved);
      setBase(next);
      setDraft(next);
      setInvalid(null);
      setNotice({ text: org_profile_saved({}, { locale }), isError: false });
    } catch (error) {
      failed(error);
    }
  };

  const changeLogo = async (file: File | null) => {
    setNotice(null);
    try {
      await logo.mutateAsync({ organisationId: organisation.id, file });
      setNotice({
        text: org_profile_logo_saved({}, { locale }),
        isError: false,
      });
    } catch (error) {
      setNotice({
        text: photoErrorMessage(appErrorCode(error), locale),
        isError: true,
      });
    }
  };

  return (
    <form className="space-y-5" noValidate onSubmit={submit}>
      {canUpload && organisation.canEdit && (
        <fieldset className="space-y-3">
          <legend className="mb-3">{org_profile_logo({}, { locale })}</legend>
          <p className="text-caption text-neutral">
            {profile_photo_card_subtitle({}, { locale })}
          </p>
          <ImageUploadField
            src={organisation.logo}
            alt={org_profile_logo({}, { locale })}
            placeholder={initials(organisation.name)}
            shape="square"
            isBusy={isBusy}
            labels={{
              choose: profile_photo_choose({}, { locale }),
              replace: profile_photo_replace({}, { locale }),
              remove: profile_photo_remove({}, { locale }),
              uploading: profile_photo_uploading({}, { locale }),
            }}
            onChoose={(file) => void changeLogo(file)}
            onRemove={() => void changeLogo(null)}
          />
        </fieldset>
      )}
      <OrganisationDetailsFields
        locale={locale}
        draft={draft}
        isBusy={isBusy}
        errorFor={(field) =>
          invalid === field ? applicationFieldError(field, locale) : null
        }
        change={(_, next) => {
          setDraft(next);
          setInvalid(null);
        }}
        bind={(field) => (element) => {
          controls.current[field] = element;
        }}
      />
      {notice && (
        <StatusMessage variant={notice.isError ? 'error' : 'success'}>
          {notice.text}
        </StatusMessage>
      )}
      <Button type="submit" disabled={isBusy || !isDirty}>
        <Save className="size-4" aria-hidden="true" />
        {update.isPending ? saving({}, { locale }) : save({}, { locale })}
      </Button>
    </form>
  );
};
