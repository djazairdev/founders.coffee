import { createCsrfMiddleware } from '@tanstack/react-start';

import { appErrorSerializationAdapter } from './app-error-adapter.js';
import { isStateChangingRequest } from './csrf.js';

/**
 * The Start options every app's `src/start.ts` is built from (P0-012 → P1-017), so the public app
 * and the admin app cannot drift apart on them. Defining a `src/start.ts` disables TanStack's
 * auto-installed CSRF middleware, so `createCsrfMiddleware()` is installed explicitly to keep
 * same-origin protection on every server function.
 *
 * CSRF allows `Sec-Fetch-Site: none` alongside `same-origin` so direct browser navigations (typed
 * URLs, bookmarks, inbound links) are not rejected with `403 Forbidden`: browsers send `none` and no
 * `Origin` on those. `filter` narrows the check to state-changing methods, which is what lets an
 * OAuth provider's cross-site redirect land; see `./csrf`.
 *
 * `serializationAdapters` carries `AppError.code` to the client; without it TanStack's shallow
 * error plugin keeps only `message` and every `appErrorCode()` branch is dead. See the adapter.
 *
 * Nothing here reaches `node:async_hooks`, so an app needs no client stub for it to use these. The
 * request context middleware is added by each app that stubs it.
 */
export const sharedStartOptions = () => ({
  serializationAdapters: [appErrorSerializationAdapter],
  requestMiddleware: [
    createCsrfMiddleware({
      secFetchSite: ['none', 'same-origin'],
      filter: ({ request }) => isStateChangingRequest(request),
    }),
  ],
});
