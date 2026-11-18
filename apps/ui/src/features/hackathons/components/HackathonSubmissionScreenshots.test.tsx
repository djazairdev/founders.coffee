import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppError } from '@founders-coffee/core';

import { EVENT_ID, mutation } from '../team-page.fixtures';
import { HackathonSubmissionScreenshots } from './HackathonSubmissionScreenshots';

const mocks = vi.hoisted(() => ({
  add: undefined as unknown,
  remove: undefined as unknown,
}));

vi.mock('../submission-hooks', () => ({
  useAddSubmissionScreenshot: () => mocks.add,
  useRemoveSubmissionScreenshot: () => mocks.remove,
}));

const shot = (id: string) => ({ id, width: 320, height: 240 });

const entry = (screenshots: ReturnType<typeof shot>[]) =>
  ({ id: 'sub_1', screenshots }) as never;

const show = (
  value: unknown,
  isReadOnly = false,
  changes: { add?: unknown } = {},
) => {
  mocks.add = changes.add ?? mutation();
  mocks.remove = mutation();
  return render(
    <HackathonSubmissionScreenshots
      eventId={EVENT_ID}
      entry={value as never}
      title="Ledger"
      isReadOnly={isReadOnly}
      locale="en"
    />,
  );
};

afterEach(cleanup);

describe('HackathonSubmissionScreenshots (B-SUB-09)', () => {
  it('asks a team with no saved project to save first, and offers no upload', () => {
    show(null);

    expect(
      screen.getByText(
        'Save your project first, then you can add screenshots.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows each image with a name, and removes the one asked for', () => {
    show(entry([shot('sht_1'), shot('sht_2')]));

    expect(
      screen
        .getByRole('img', { name: 'Screenshot 2 of Ledger' })
        .getAttribute('src'),
    ).toBe('/media/submission/sht_2');
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove screenshot 2' }),
    );

    expect(
      (mocks.remove as ReturnType<typeof mutation>).mutate,
    ).toHaveBeenCalledWith('sht_2');
  });

  it('sends the chosen file, and stops offering an upload at three', () => {
    const { container } = show(entry([shot('sht_1')]));
    const file = new File(['x'], 'shot.png', { type: 'image/png' });
    fireEvent.change(container.querySelector('input[type="file"]') as Element, {
      target: { files: [file] },
    });
    expect(
      (mocks.add as ReturnType<typeof mutation>).mutate,
    ).toHaveBeenCalledWith(file);
    cleanup();

    show(entry([shot('sht_1'), shot('sht_2'), shot('sht_3')]));
    expect(
      screen.queryByRole('button', { name: 'Add a screenshot' }),
    ).toBeNull();
  });

  it('only shows the images to a teammate, and nothing when there are none', () => {
    show(entry([shot('sht_1')]), true);
    expect(screen.getByRole('img')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    cleanup();

    const { container } = show(entry([]), true);
    expect(container.innerHTML).toBe('');
  });

  it('says why an upload was refused', () => {
    show(entry([]), false, {
      add: {
        ...mutation(),
        error: new AppError('photo_too_large', 'Too large'),
      },
    });

    expect(
      screen.getByText('This image is too big. Choose one under 5 MB.'),
    ).toBeTruthy();
  });
});
