const HTML_ONLY_REFUSAL = 'Only HTML requests are supported here';

const PAGE_TYPES = ['*/*', 'text/html'];

/**
 * Whether `request` takes an HTML page, read the way TanStack Start reads it before rendering one:
 * an `Accept` with a part naming HTML or any type at all, or no `Accept`.
 */
const acceptsPage = (request: Request): boolean =>
  (request.headers.get('Accept') || '*/*')
    .split(',')
    .some((part) => PAGE_TYPES.some((type) => part.trim().startsWith(type)));

const isHtmlOnlyRefusal = (body: unknown): boolean =>
  typeof body === 'object' &&
  body !== null &&
  'error' in body &&
  body.error === HTML_ONLY_REFUSAL;

export const withNotAcceptableForPages = async (
  request: Request,
  response: Response,
): Promise<Response> => {
  if (response.status !== 406 || acceptsPage(request)) return response;
  const body: unknown = await response
    .clone()
    .json()
    .catch(() => undefined);
  if (!isHtmlOnlyRefusal(body)) return response;
  return new Response('Not acceptable', {
    status: 406,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', Vary: 'Accept' },
  });
};
