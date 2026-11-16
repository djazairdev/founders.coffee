import { appErrorCode } from '@founders-coffee/core';
import {
  profile_photo_alt,
  profile_photo_choose,
  profile_photo_remove,
  profile_photo_replace,
  profile_photo_saved,
  profile_photo_removed,
  profile_photo_uploading,
  type Locale,
} from '@founders-coffee/i18n';
import { ImageUploadField, type ToastMessage } from '@founders-coffee/ui';

import { initials } from '../../../lib/utils';
import { photoErrorMessage } from '../errors';
import { usePhotoUpload, useRemovePhoto } from '../hooks';
import { profilePhotoUrl } from '../photo-url';

export const ProfilePhotoField = ({
  locale,
  displayName,
  photoAssetId,
  isDisabled,
  onPhotoChange,
  onFeedback,
}: {
  locale: Locale;
  displayName: string;
  photoAssetId: string | null;
  isDisabled?: boolean;
  onPhotoChange: (assetId: string | null) => void;
  onFeedback: (message: string, variant: ToastMessage['variant']) => void;
}) => {
  const upload = usePhotoUpload();
  const remove = useRemovePhoto();
  const busy = upload.isPending || remove.isPending || isDisabled === true;

  const choose = async (file: File | undefined) => {
    if (!file) return;
    try {
      onPhotoChange(await upload.mutateAsync({ file }));
      onFeedback(profile_photo_saved({}, { locale }), 'success');
    } catch (failure) {
      onFeedback(photoErrorMessage(appErrorCode(failure), locale), 'error');
    }
  };

  const discard = async () => {
    try {
      await remove.mutateAsync();
      onPhotoChange(null);
      onFeedback(profile_photo_removed({}, { locale }), 'success');
    } catch (failure) {
      onFeedback(photoErrorMessage(appErrorCode(failure), locale), 'error');
    }
  };

  return (
    <ImageUploadField
      src={photoAssetId ? profilePhotoUrl(photoAssetId, 'md') : null}
      alt={profile_photo_alt({}, { locale })}
      placeholder={initials(displayName)}
      labels={{
        choose: profile_photo_choose({}, { locale }),
        replace: profile_photo_replace({}, { locale }),
        remove: profile_photo_remove({}, { locale }),
        uploading: profile_photo_uploading({}, { locale }),
      }}
      isBusy={busy}
      onChoose={(file) => void choose(file)}
      onRemove={() => void discard()}
    />
  );
};
