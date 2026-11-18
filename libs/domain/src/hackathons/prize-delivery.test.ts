import { describe, expect, it } from 'vitest';

import {
  decidePrizeAssignment,
  decidePrizeDelivery,
  prizeDeliverySchema,
} from './prize-delivery.js';

const OPEN = { isCancelled: false, isResultsPublished: true };
const ENTRY = { isDisqualified: false };

const codeOf = (result: { ok: boolean; error?: { code: string } }) =>
  result.ok ? 'ok' : result.error?.code;

describe('decidePrizeAssignment', () => {
  it('gives a prize to an entry in the results while it has not been received', () => {
    expect(
      codeOf(decidePrizeAssignment({ ...OPEN, delivery: null, entry: ENTRY })),
    ).toBe('ok');
    expect(
      codeOf(
        decidePrizeAssignment({ ...OPEN, delivery: 'sent', entry: ENTRY }),
      ),
    ).toBe('ok');
  });

  it('refuses before the results, once cancelled, once received, and for an entry out of the running', () => {
    expect(
      codeOf(
        decidePrizeAssignment({
          ...OPEN,
          isResultsPublished: false,
          delivery: null,
          entry: ENTRY,
        }),
      ),
    ).toBe('results_not_published');
    expect(
      codeOf(
        decidePrizeAssignment({
          ...OPEN,
          isCancelled: true,
          delivery: null,
          entry: ENTRY,
        }),
      ),
    ).toBe('hackathon_not_editable');
    expect(
      codeOf(
        decidePrizeAssignment({ ...OPEN, delivery: 'received', entry: ENTRY }),
      ),
    ).toBe('prize_delivered');
    expect(
      codeOf(
        decidePrizeAssignment({
          ...OPEN,
          delivery: null,
          entry: { isDisqualified: true },
        }),
      ),
    ).toBe('prize_entry_unavailable');
    expect(
      codeOf(decidePrizeAssignment({ ...OPEN, delivery: null, entry: null })),
    ).toBe('prize_entry_unavailable');
  });
});

describe('decidePrizeDelivery', () => {
  it('records a delivery only for a prize that has a holder', () => {
    expect(codeOf(decidePrizeDelivery({ ...OPEN, isAwarded: true }))).toBe(
      'ok',
    );
    expect(codeOf(decidePrizeDelivery({ ...OPEN, isAwarded: false }))).toBe(
      'prize_not_awarded',
    );
  });
});

describe('prizeDeliverySchema', () => {
  it('reads a blank note as none', () => {
    const parsed = prizeDeliverySchema.parse({
      eventId: 'evt_0123456789abcdef0123456789abcdef',
      prizeId: 'prz_0123456789abcdef0123456789abcdef',
      status: 'sent',
      note: '   ',
    });
    expect(parsed.note).toBeNull();
  });
});
