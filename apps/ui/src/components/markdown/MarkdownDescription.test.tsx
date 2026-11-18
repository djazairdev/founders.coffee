import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MarkdownDescription } from './MarkdownDescription';
import { markdownPlainText } from '../../lib/markdown-plain-text';

vi.mock('./useMarkdownRuntime', () => ({
  useMarkdownRuntime: () => ({ status: 'loading' }),
}));

afterEach(cleanup);

describe('MarkdownDescription', () => {
  it('keeps a readable text fallback while the formatted renderer loads', () => {
    render(
      <MarkdownDescription
        locale="en"
        label="Hackathon description"
        value={'# Challenge\n\n- **Build a tool**\n- Share a `demo`'}
      />,
    );

    expect(
      screen.getByRole('region', { name: 'Hackathon description' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: 'Challenge', level: 2 }),
    ).toBeTruthy();
    expect(screen.getByRole('list').tagName).toBe('UL');
    expect(screen.getByText('Challenge')).toBeTruthy();
    expect(screen.getByText('Build a tool')).toBeTruthy();
    expect(screen.getByText('demo').tagName).toBe('CODE');
    expect(document.body.textContent).not.toMatch(/(^|\s)#{1,6}\s|\*\*|`/u);
  });

  it('marks Arabic content right to left when the page locale is different', () => {
    render(
      <MarkdownDescription
        locale="en"
        language="ar"
        label="وصف الهاكاثون"
        value="# عن الهاكاثون"
      />,
    );

    expect(screen.getByRole('region').getAttribute('dir')).toBe('rtl');
    expect(screen.getByRole('region').getAttribute('lang')).toBe('ar');
  });
});

describe('markdownPlainText', () => {
  it('removes block and inline Markdown markers without dropping its text', () => {
    expect(
      markdownPlainText(
        '# Goals\n\n## Challenges\n\n- **First**\n- `Second`\n\n[Register](https://example.com)',
      ),
    ).toBe('Goals\n\nChallenges\n\nFirst\nSecond\n\nRegister');
  });

  it('excludes code blocks, tables, raw URLs, and HTML from plain-text metadata', () => {
    expect(
      markdownPlainText(
        [
          'A hackathon for local builders.',
          '',
          '```ts',
          'const secret = "not metadata";',
          '```',
          '',
          'Track | Focus',
          '--- | ---',
          'Open source | Local tools',
          '',
          'Read [the rules](https://example.com/rules) <https://example.com> <em>before joining</em>.',
        ].join('\n'),
      ),
    ).toBe('A hackathon for local builders.\n\nRead the rules before joining.');
  });

  it('removes script and style content, including unclosed raw elements', () => {
    expect(
      markdownPlainText(
        'Visible <script>alert(1)</script > text <style>hidden</style> and <script>unclosed',
      ),
    ).toBe('Visible text and');
  });
});
