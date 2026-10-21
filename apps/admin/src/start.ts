import { createStart } from '@tanstack/react-start';

import { sharedStartOptions } from '@founders-coffee/server-fns/start';

/**
 * Global middleware and serialization for the admin app, from the options every app shares: CSRF on
 * every state-changing server function, and `AppError` codes that reach the client. This file is
 * auto-discovered by the `tanstackStart()` vite plugin. Both `default` and `startInstance` are
 * required: `default` is the legacy export, `startInstance` the one `hydrateStart` expects.
 */
const app = createStart(() => sharedStartOptions());

export const startInstance = app;
export default app;
