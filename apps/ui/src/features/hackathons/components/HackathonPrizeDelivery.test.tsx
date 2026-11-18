import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppError } from '@founders-coffee/core';

import type { PrizeDeliveryView } from '../api';
import { EVENT_ID, mutation } from '../team-page.fixtures';
import { HackathonPrizeDelivery } from './HackathonPrizeDelivery';

type Change = ReturnType<typeof mutation>;

const mocks = vi.hoisted(() => ({
  data: undefined as unknown,
  assign: undefined as unknown,
  deliver: undefined as unknown,
}));

vi.mock('../results-hooks', () => ({
  usePrizeDelivery: () => ({ data: mocks.data }),
  useAssignPrize: () => mocks.assign,
  useSetPrizeDelivery: () => mocks.deliver,
}));

const VIEW: PrizeDeliveryView = {
  isOpen: true,
  prizes: [
    {
      prizeId: 'prz_1',
      title: 'First prize',
      place: 1,
      trackTitle: null,
      submissionId: 'sub_1',
      status: 'pending',
      note: null,
    },
  ],
  entries: [
    {
      submissionId: 'sub_1',
      teamName: 'Byte Club',
      title: 'Ledger',
      isDisqualified: false,
    },
    {
      submissionId: 'sub_2',
      teamName: 'Souk Squad',
      title: 'Souk',
      isDisqualified: false,
    },
    {
      submissionId: 'sub_3',
      teamName: 'Copy Cats',
      title: 'Copied',
      isDisqualified: true,
    },
  ],
};

const renderPanel = (view: PrizeDeliveryView = VIEW) => {
  mocks.data = view;
  mocks.assign = mutation();
  mocks.deliver = mutation();
  return render(
    <HackathonPrizeDelivery
      eventId={EVENT_ID}
      locale="en"
      onFeedback={vi.fn()}
    />,
  );
};

afterEach(cleanup);

describe('HackathonPrizeDelivery (B-PRZ-02)', () => {
  it('shows nothing until the results are out', () => {
    const { container } = renderPanel({
      isOpen: false,
      prizes: [],
      entries: [],
    });

    expect(container.innerHTML).toBe('');
  });

  it('moves a prize to another entry, and keeps a disqualified one out of reach', () => {
    renderPanel();
    const holder = screen.getByLabelText('Goes to');

    expect(
      within(holder).getByRole<HTMLOptionElement>('option', {
        name: /Copy Cats/u,
      }).disabled,
    ).toBe(true);
    expect(
      screen
        .getByRole('button', { name: 'Award' })
        .getAttribute('aria-disabled'),
    ).toBe('true');

    fireEvent.change(holder, { target: { value: 'sub_2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Award' }));

    expect((mocks.assign as Change).mutate).toHaveBeenCalledWith(
      {
        eventId: EVENT_ID,
        prizeId: 'prz_1',
        submissionId: 'sub_2',
      },
      expect.anything(),
    );
  });

  it('records the delivery and the private note', () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText('Delivery'), {
      target: { value: 'received' },
    });
    fireEvent.change(screen.getByLabelText('Private note'), {
      target: { value: 'Signed for.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect((mocks.deliver as Change).mutate).toHaveBeenCalledWith(
      {
        eventId: EVENT_ID,
        prizeId: 'prz_1',
        status: 'received',
        note: 'Signed for.',
      },
      expect.anything(),
    );
  });

  it('locks the holder once the prize is received, and offers no delivery before it has one', () => {
    const [prize] = VIEW.prizes;
    if (!prize) return;
    renderPanel({
      ...VIEW,
      prizes: [{ ...prize, status: 'received' }],
    });
    expect(screen.getByLabelText('Goes to')).toHaveProperty('disabled', true);
    cleanup();

    renderPanel({
      ...VIEW,
      prizes: [{ ...prize, submissionId: null, status: null }],
    });
    expect(screen.queryByLabelText('Delivery')).toBeNull();
  });

  it('says why a change was refused', () => {
    renderPanel();
    cleanup();
    mocks.data = VIEW;
    const feedback = vi.fn();
    mocks.assign = {
      mutate: vi.fn(
        (_request: unknown, options?: { onError?: (error: unknown) => void }) =>
          options?.onError?.(
            new AppError('prize_delivered', 'Already received'),
          ),
      ),
      isPending: false,
    };
    mocks.deliver = mutation();
    render(
      <HackathonPrizeDelivery
        eventId={EVENT_ID}
        locale="en"
        onFeedback={feedback}
      />,
    );

    fireEvent.change(screen.getByLabelText('Goes to'), {
      target: { value: 'sub_2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Award' }));
    expect(feedback).toHaveBeenCalledWith(
      'This prize was already received, so it cannot go to another team.',
      'error',
    );
  });
});
