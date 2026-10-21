import { createStart } from '@tanstack/react-start';

import { requestContextMiddleware } from '@founders-coffee/server-fns/request-context';
import { sharedStartOptions } from '@founders-coffee/server-fns/start';

/**
 * Global middleware and serialization for the UI app: the options every app shares, plus
 * `requestContextMiddleware`, which gives every server function a per-request id in the context the
 * structured logger reads (AGENTS §13). This file is auto-discovered by the `tanstackStart()` vite
 * plugin. Both `default` and `startInstance` are required: `default` is the legacy export,
 * `startInstance` the one `hydrateStart` expects.
 */
const app = createStart(() => ({
  ...sharedStartOptions(),
  functionMiddleware: [requestContextMiddleware],
}));

export const startInstance = app;
export default app;
