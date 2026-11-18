export const json = (status: number, code: string) =>
  new Response(JSON.stringify({ code }), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });

export const UPLOAD_STATUS: Record<string, number> = {
  not_found: 404,
  photo_reservation_used: 409,
  photo_reservation_expired: 410,
  photo_too_large: 413,
  photo_too_small: 422,
  photo_unsupported: 415,
  validation_failed: 422,
};

/**
 * Refuse a browser upload that another site started.
 *
 * The session cookie is `SameSite=Lax`, so a cross-site `PUT` never carries it and the request
 * would fail as unauthenticated anyway — this is the same check stated where it can be read rather
 * than inferred from a cookie attribute three files away. An absent header is allowed: only
 * browsers send `Sec-Fetch-Site`, and refusing its absence would refuse every non-browser client
 * including the release gate.
 */
export const isCrossSite = (request: Request): boolean => {
  const site = request.headers.get('sec-fetch-site');
  return site !== null && site !== 'same-origin' && site !== 'none';
};
