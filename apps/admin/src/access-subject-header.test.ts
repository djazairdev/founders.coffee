import { describe, expect, it } from 'vitest';

import { ADMIN_ACCESS_SUBJECT_HEADER } from '@founders-coffee/core';

import { withAccessSubject } from './access-subject-header.js';

const forged = () =>
  new Request('https://admin.example/_serverFn/decide', {
    method: 'POST',
    headers: {
      [ADMIN_ACCESS_SUBJECT_HEADER]: 'someone-else',
      'content-type': 'application/json',
    },
    body: '{"organisationId":"org_1"}',
  });

describe('the Access subject an admin request carries', () => {
  it('replaces whatever the browser sent with the verified subject', async () => {
    const request = withAccessSubject(forged(), 'access-subject-1');

    expect(request.headers.get(ADMIN_ACCESS_SUBJECT_HEADER)).toBe(
      'access-subject-1',
    );
    expect(request.method).toBe('POST');
    expect(await request.text()).toBe('{"organisationId":"org_1"}');
  });

  it('drops a forged subject when there is no verified one', () => {
    const request = withAccessSubject(forged(), null);

    expect(request.headers.has(ADMIN_ACCESS_SUBJECT_HEADER)).toBe(false);
    expect(request.headers.get('content-type')).toBe('application/json');
  });
});
