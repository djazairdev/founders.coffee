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
    expect(screen.getByRole('heading', { name: 'Challenge', level: 1 })).toBeTruthy();
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
});
