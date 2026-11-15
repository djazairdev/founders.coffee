import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  renderHackathonWizard,
  resetHackathonWizard,
} from './HackathonCreatePage.fixtures';

describe('hackathon classification validation', () => {
  afterEach(resetHackathonWizard);

  it('requires a category and tag, and clears each message when selected', () => {
    renderHackathonWizard();
    fireEvent.change(screen.getByLabelText('Hackathon title'), {
      target: { value: 'Algiers Builders Weekend' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(
      document.getElementById('hackathon-fields-required')?.textContent,
    ).toBe('Required');
    expect(
      document.getElementById('hackathon-fields-required')?.className,
    ).toContain('text-error');
    expect(
      document.getElementById('hackathon-type-tags-required')?.textContent,
    ).toBe('Required');
    expect(
      document.getElementById('hackathon-type-tags-required')?.className,
    ).toContain('text-error');
    expect(screen.getAllByText('Required')).toHaveLength(3);
    expect(
      screen.getByRole('group', { name: /Areas/ }).getAttribute('aria-invalid'),
    ).toBe('true');

    fireEvent.click(
      screen.getByRole('button', { name: 'Artificial intelligence' }),
    );
    expect(
      document.getElementById('hackathon-fields-required')?.className,
    ).toContain('text-neutral');
    expect(
      document.getElementById('hackathon-type-tags-required')?.className,
    ).toContain('text-error');

    fireEvent.click(screen.getByRole('button', { name: 'Open topic' }));
    expect(
      document.getElementById('hackathon-type-tags-required')?.className,
    ).toContain('text-neutral');
    expect(screen.getAllByText('Required')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(
      screen.getByRole('heading', {
        name: 'When will the hackathon take place?',
      }),
    ).toBeTruthy();
  });
});
