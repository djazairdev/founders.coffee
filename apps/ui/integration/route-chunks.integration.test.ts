import { createDb, seed } from '@founders-coffee/db';
import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';

import { Route as EventRoute } from '../src/routes/$locale.$market.e.$slug';
import worker from '../src/server';

const get = async (pathname: string): Promise<Response> => {
  const context = createExecutionContext();
  const response = await worker.fetch(
    new Request(`https://staging.founders.coffee${pathname}`, {
      headers: { accept: 'text/html' },
    }),
    env,
    context,
  );
  await waitOnExecutionContext(context);
  return response;
};

describe('a page whose loader answers 404', () => {
  beforeAll(async () => {
    await seed(createDb(env.DB));
  });

  it('leaves no load of its route chunk running once the response is out', async () => {
    const response = await get('/fr/algeria/e/no-such-meetup');
    await response.text();

    expect(response.status).toBe(404);
    expect(EventRoute._componentsPromise).toBeUndefined();
  });
});
