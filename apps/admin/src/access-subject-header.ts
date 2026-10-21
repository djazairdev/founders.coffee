import { ADMIN_ACCESS_SUBJECT_HEADER } from '@founders-coffee/core';

/**
 * The request the app sees, carrying the Access subject this Worker verified and nothing a browser
 * sent under that name. Server functions read the header to attribute an operator's decision in the
 * audit log, so it is dropped on every request and set only from a verified identity.
 */
export const withAccessSubject = (
  request: Request,
  subject: string | null,
): Request => {
  const headers = new Headers(request.headers);
  headers.delete(ADMIN_ACCESS_SUBJECT_HEADER);
  if (subject) headers.set(ADMIN_ACCESS_SUBJECT_HEADER, subject);
  return new Request(request, { headers });
};
