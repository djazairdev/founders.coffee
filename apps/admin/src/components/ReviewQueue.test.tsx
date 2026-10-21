import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ReviewQueue } from './ReviewQueue';

afterEach(() => cleanup());

const labels = {
  loadingLabel: 'Loading…',
  errorLabel: 'Could not load.',
  emptyLabel: 'Nothing here.',
};

const renderQueue = (state: {
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
}) =>
  render(
    <ReviewQueue
      {...labels}
      filter={<p>filter</p>}
      isEmpty={state.isEmpty ?? false}
      isError={state.isError ?? false}
      isLoading={state.isLoading ?? false}
    >
      <li>an item</li>
    </ReviewQueue>,
  );

describe('a review queue', () => {
  it('says it is loading', () => {
    renderQueue({ isLoading: true, isEmpty: true });

    expect(screen.getByRole('status').textContent).toContain('Loading…');
    expect(screen.queryByText('an item')).toBeNull();
  });

  it('explains a failed load, even with an empty list', () => {
    renderQueue({ isError: true, isEmpty: true });

    expect(screen.getByText('Could not load.')).toBeTruthy();
  });

  it('says when there is nothing to review', () => {
    renderQueue({ isEmpty: true });

    expect(screen.getByText('Nothing here.')).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('lists the items beneath the filter', () => {
    renderQueue({});

    expect(screen.getByText('filter')).toBeTruthy();
    expect(screen.getByRole('list').textContent).toBe('an item');
  });
});
