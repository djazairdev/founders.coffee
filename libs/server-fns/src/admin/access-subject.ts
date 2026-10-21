import { ADMIN_ACCESS_SUBJECT_HEADER } from '@founders-coffee/core';

/**
 * The Cloudflare Access subject of the operator making this admin request, for the audit log.
 *
 * The admin Worker verifies the Access token and the session before any server function runs, and
 * it overwrites this header with the subject it verified on every request it admits, so a value a
 * browser sent never arrives. Functions that read it are exported only from the `admin` entry,
 * which the public app never bundles.
 */
export const adminAccessSubject = (headers: Headers): string | null =>
  headers.get(ADMIN_ACCESS_SUBJECT_HEADER) || null;
