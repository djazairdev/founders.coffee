export interface ImageUploadFailure {
  readonly code: string;
}

const CODE_BY_STATUS: Record<number, string> = {
  401: 'unauthenticated',
  413: 'photo_too_large',
  415: 'photo_unsupported',
  429: 'rate_limited',
  503: 'photo_storage_unavailable',
};

/**
 * Send a chosen file to the place a reservation just claimed.
 *
 * The body is the file itself rather than a form or an RPC envelope: an image is already bytes, and
 * wrapping it in either would cost a copy and, in the JSON case, a third again in base64. The
 * response is small and always describes itself with a `code`, so the caller can say what went
 * wrong in the member's language instead of showing a status number.
 */
export const putImage = async (
  path: string,
  file: Blob,
): Promise<{ ok: true } | { ok: false; error: ImageUploadFailure }> => {
  const response = await fetch(path, {
    method: 'PUT',
    body: file,
    headers: { 'content-type': file.type || 'application/octet-stream' },
  });
  if (response.ok) return { ok: true };

  const body = (await response.json().catch(() => null)) as {
    code?: string;
  } | null;
  return {
    ok: false,
    error: {
      code: body?.code ?? CODE_BY_STATUS[response.status] ?? 'photo_failed',
    },
  };
};
