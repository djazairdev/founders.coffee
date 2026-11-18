import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  getHostCreateMocks,
  renderHostCreateWizard,
  resetHostCreateFixtures,
} from './HostCreatePage.fixtures';
import {
  fillHostDetails,
  goToHostDetails,
} from './HostCreatePage.flows.fixtures';

const hostCreateMocks = getHostCreateMocks();

const topics = () => within(screen.getByRole('group', { name: 'Topics' }));

const topic = (name: string) =>
  topics().getByRole<HTMLButtonElement>('button', { name });

const publish = () => {
  fillHostDetails();
  fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
};

describe('picking topics in the wizard (B-EVT-07)', () => {
  afterEach(resetHostCreateFixtures);

  it('offers every topic, none chosen, and publishes with none', async () => {
    renderHostCreateWizard('en');
    await goToHostDetails();

    expect(topics().getAllByRole('button')).toHaveLength(14);
    expect(
      topics()
        .getAllByRole('button')
        .every((button) => button.getAttribute('aria-pressed') === 'false'),
    ).toBe(true);
    publish();

    await waitFor(() =>
      expect(hostCreateMocks.mutateAsync).toHaveBeenCalledOnce(),
    );
    expect(hostCreateMocks.mutateAsync).toHaveBeenCalledWith({
      data: { event: expect.objectContaining({ tags: [] }) },
    });
  });

  it('publishes the topics chosen, in the order they were picked', async () => {
    renderHostCreateWizard('en');
    await goToHostDetails();
    fireEvent.click(topic('Investing'));
    fireEvent.click(topic('Design'));
    publish();

    await waitFor(() =>
      expect(hostCreateMocks.mutateAsync).toHaveBeenCalledOnce(),
    );
    expect(hostCreateMocks.mutateAsync).toHaveBeenCalledWith({
      data: {
        event: expect.objectContaining({ tags: ['investing', 'design'] }),
      },
    });
  });

  it('stops at five, and frees a place when one is taken back', async () => {
    renderHostCreateWizard('en');
    await goToHostDetails();
    const buttons = topics().getAllByRole<HTMLButtonElement>('button');
    for (const button of buttons.slice(0, 5)) fireEvent.click(button);

    expect(buttons.slice(5).every((button) => button.disabled)).toBe(true);
    fireEvent.click(buttons[0] as HTMLButtonElement);
    expect(buttons.slice(5).some((button) => button.disabled)).toBe(false);
  });

  it('keeps the topics through a step back', async () => {
    renderHostCreateWizard('en');
    await goToHostDetails();
    fireEvent.click(topic('Design'));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(topic('Design').getAttribute('aria-pressed')).toBe('true');
  });
});
