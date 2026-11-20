import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { id } from '@founders-coffee/core';

import type { MissingCloseoutItem } from '../api';
import { MissingCloseoutCard } from './MissingCloseoutCard';

afterEach(() => cleanup());

const item: MissingCloseoutItem = {
  eventId: id('evt'),
  title: 'Oran student builders meetup',
  marketCode: 'DZ',
  endsAt: new Date('2026-11-18T17:00:00Z'),
  timeZone: 'Africa/Algiers',
};

const renderCard = (canCreate = true, locale: 'en' | 'ar' | 'fr' = 'en') => {
  const onCreate = vi.fn();
  render(
    <MissingCloseoutCard
      canCreate={canCreate}
      isSaving={false}
      item={item}
      locale={locale}
      onCreate={onCreate}
    />,
  );
  return onCreate;
};

describe('admin missing meetup closeout card (CO-08)', () => {
  it('shows the meetup and selects an outcome without inventing attendance', () => {
    const onCreate = renderCard();

    expect(
      screen.getByRole('heading', { name: 'Oran student builders meetup' }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Record only whether the meetup happened. This action does not record attendance or feedback.',
      ),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Meetup outcome'), {
      target: { value: 'did_not_happen' },
    });
    expect(
      screen.getByText('Participants who RSVP’d will be notified.'),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Record outcome' }));

    expect(onCreate).toHaveBeenCalledWith({
      eventId: item.eventId,
      outcome: 'did_not_happen',
    });
  });

  it('does not render the action for an operator without closeout override permission', () => {
    renderCard(false);

    expect(screen.queryByRole('button', { name: 'Record outcome' })).toBeNull();
    expect(screen.queryByLabelText('Meetup outcome')).toBeNull();
  });

  it('localizes the action and outcome labels', () => {
    renderCard(true, 'ar');
    expect(screen.getByRole('button', { name: 'تسجيل النتيجة' })).toBeTruthy();
    cleanup();
    renderCard(true, 'fr');
    expect(
      screen.getByRole('button', { name: 'Enregistrer le résultat' }),
    ).toBeTruthy();
  });
});
