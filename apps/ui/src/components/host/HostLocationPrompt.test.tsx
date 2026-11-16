import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HostLocationPrompt } from './HostLocationPrompt';

vi.mock('./CitySuggestions', () => ({ CitySuggestions: () => null }));
vi.mock('../../features/geo/hooks', () => ({
  useDebouncedValue: <T,>(value: T) => value,
}));

afterEach(() => cleanup());

describe('HostLocationPrompt copy', () => {
  it('keeps the existing event copy when no override is provided', () => {
    render(
      <HostLocationPrompt
        locale="en"
        marketCode="DZ"
        reason={null}
        onLocate={vi.fn()}
        onCitySelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Let’s find a café near you')).toBeTruthy();
    expect(
      screen.getByText(
        'Share your location or tell us your city, and the map will show you the cafés nearby.',
      ),
    ).toBeTruthy();
  });

  it('uses the hackathon-specific copy when provided', () => {
    render(
      <HostLocationPrompt
        locale="en"
        marketCode="DZ"
        reason={null}
        copy={{
          title: 'Choose a location for your hackathon',
          body: 'Share your location or choose a city to see nearby places to host the hackathon.',
        }}
        onLocate={vi.fn()}
        onCitySelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByText('Choose a location for your hackathon'),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Share your location or choose a city to see nearby places to host the hackathon.',
      ),
    ).toBeTruthy();
  });
});
