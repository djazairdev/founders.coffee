import { describe, expect, it } from 'vitest';

import { canTransition, transition } from './status-machine.js';

describe('events status machine', () => {
  it('allows published → cancelled', () => {
    expect(canTransition('published', 'cancelled')).toBe(true);
    const result = transition('published', 'cancelled');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('cancelled');
  });

  it('allows cancelled → published (re-publish)', () => {
    expect(canTransition('cancelled', 'published')).toBe(true);
    const result = transition('cancelled', 'published');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('published');
  });

  it('rejects published → published (same-state)', () => {
    expect(canTransition('published', 'published')).toBe(false);
    const result = transition('published', 'published');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_event_transition');
  });

  it('publishes or cancels a draft', () => {
    expect(canTransition('draft', 'published')).toBe(true);
    expect(canTransition('draft', 'cancelled')).toBe(true);
    const result = transition('draft', 'published');
    expect(result.ok && result.data).toBe('published');
  });

  it('never sends an event back to draft', () => {
    for (const from of ['draft', 'published', 'cancelled'] as const) {
      expect(canTransition(from, 'draft')).toBe(false);
      const result = transition(from, 'draft');
      expect(!result.ok && result.error.code).toBe('invalid_event_transition');
    }
  });
});
