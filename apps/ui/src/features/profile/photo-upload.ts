import { putImage } from '../../lib/put-image';

/** Send the chosen photo to the key a reservation just claimed. */
export const putProfilePhoto = (assetId: string, file: Blob) =>
  putImage(`/api/profile/photo/${assetId}`, file);
