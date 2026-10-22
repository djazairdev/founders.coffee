import { createIsomorphicFn, getRouterInstance } from '@tanstack/react-start';

/**
 * Loads the code-split chunks of every route the request matches on the server, before any loader
 * runs. TanStack Router starts a route's chunk beside its loader, caches the pending load on the
 * module-level route, and skips awaiting it when the loader throws `notFound` or a redirect. Under
 * `vite dev` that load is an RPC owned by the request that started it, so once that response ends
 * it never settles, and every later request for the route waits on it forever. Awaiting it here
 * settles it inside the request that started it; once a chunk has loaded, the router returns at
 * once. The browser fetches chunks as navigation needs them, so it skips this.
 */
export const loadMatchedRouteChunks = createIsomorphicFn()
  .server(async (): Promise<void> => {
    const router = await getRouterInstance();
    const { matchedRoutes } = router.getMatchedRoutes(
      router.latestLocation.pathname,
    );
    await Promise.all(
      matchedRoutes.map((route) => router.loadRouteChunk(route)),
    );
  })
  .client(async (): Promise<void> => undefined);
