import { describe, expect, it } from 'vitest';

import { hackathonSummary } from './hackathon-summary';

describe('hackathonSummary', () => {
  it('uses readable prose after headings and removes inline Markdown', () => {
    expect(
      hackathonSummary(
        '# Build together\n\nCreate a useful tool for local communities with a team of designers and developers. **Share your work** at the end of the event.',
      ),
    ).toBe(
      'Create a useful tool for local communities with a team of designers and developers. Share your work at the end of the event.',
    );
  });

  it('skips code, tables, headings, and standalone URLs', () => {
    expect(
      hackathonSummary(
        [
          '# About',
          '',
          '```ts',
          'const challenge = "not a summary";',
          '```',
          '',
          '| Track | Focus |',
          '| --- | --- |',
          '| Civic tech | Access |',
          '',
          'https://example.com/challenge',
          '',
          'Build a small tool that helps neighbourhood teams find local support.',
        ].join('\n'),
      ),
    ).toBe(
      'Build a small tool that helps neighbourhood teams find local support.',
    );
  });

  it('keeps link labels and clips long descriptions at a word boundary', () => {
    const longDescription = `Build a thoughtful product for communities with limited access to local services. ${'Bring your research, share it with mentors, and make a prototype that helps people take the next step. '.repeat(4)}`;
    const summary = hackathonSummary(
      `${longDescription} [Read the challenge](https://example.com)`,
    );

    expect(summary).not.toContain('https://example.com');
    expect(Array.from(summary ?? '').length).toBeLessThanOrEqual(240);
    expect(summary?.endsWith('…')).toBe(true);
  });

  it('returns no summary when the document has only structural blocks', () => {
    expect(hackathonSummary('# Rules\n\n```\nexample\n```\n\n| A | B |')).toBe(
      null,
    );
  });
});
