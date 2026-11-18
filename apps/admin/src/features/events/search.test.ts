import { describe, expect, it } from 'vitest';

import { readEventCoHostSearch } from './search';

describe('the event an operator named in the address (B-EVT-20)', () => {
  it('keeps a reference, trimmed', () => {
    expect(readEventCoHostSearch({ event: ' /en/algeria/e/coffee ' })).toEqual({
      event: '/en/algeria/e/coffee',
    });
  });

  it.each([
    {},
    { event: '' },
    { event: '   ' },
    { event: 42 },
    { event: 'x'.repeat(501) },
  ])('names no event for %j', (search) => {
    expect(readEventCoHostSearch(search)).toEqual({});
  });
});
