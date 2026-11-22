import { describe, expect, it } from 'vitest';

import { hackathonDraftEmailSchema } from './draft-email.js';

describe('hackathon draft email request', () => {
  it('accepts a supported template and trims the recipient', () => {
    const result = hackathonDraftEmailSchema.safeParse({
      eventId: 'evt_0123456789abcdef0123456789abcdef',
      template: 'draft-completion-reminder',
      recipient: ' organiser@example.test ',
      locale: 'ar',
    });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Expected the email request to parse');
    expect(result.data.recipient).toBe('organiser@example.test');
  });

  it('rejects unsupported templates and extra properties', () => {
    const input = {
      eventId: 'evt_0123456789abcdef0123456789abcdef',
      template: 'draft-completion-reminder',
      recipient: 'organiser@example.test',
      locale: 'ar',
    };

    expect(
      hackathonDraftEmailSchema.safeParse({ ...input, template: 'unknown' })
        .success,
    ).toBe(false);
    expect(
      hackathonDraftEmailSchema.safeParse({ ...input, debug: true }).success,
    ).toBe(false);
  });
});
