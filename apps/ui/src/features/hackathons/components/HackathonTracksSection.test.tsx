import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Locale } from '@founders-coffee/i18n';

import type { HackathonDraftView } from '../api';
import { draftView, savedDetails } from '../hackathon-details-form.fixtures';
import { HackathonTracksSection } from './HackathonTracksSection';

const BRIEF = 'Build a tool that a founder in Algiers would use every week.';

const mocks = vi.hoisted(() => ({
  save: {
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null as unknown,
    data: undefined as { eventId: string; version: number } | undefined,
  },
}));

vi.mock('../hooks', () => ({
  useSaveHackathonTracks: () => mocks.save,
}));

const saved: HackathonDraftView['tracks'] = [
  {
    id: 'trk_payments',
    kind: 'founder_problem',
    title: 'Payments',
    brief: BRIEF,
    partnerName: null,
    sourceUrls: [],
  },
  {
    id: 'trk_hiring',
    kind: 'founder_problem',
    title: 'Hiring',
    brief: BRIEF,
    partnerName: null,
    sourceUrls: [],
  },
];

const renderSection = (
  draft: HackathonDraftView = draftView({ details: savedDetails }),
  locale: Locale = 'en',
) => render(<HackathonTracksSection draft={draft} locale={locale} />);

const titles = () =>
  screen
    .getAllByLabelText('Title')
    .map((input) => (input as HTMLInputElement).value);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  Object.assign(mocks.save, {
    isSuccess: false,
    isError: false,
    error: null,
    data: undefined,
  });
});

describe('HackathonTracksSection (B-HKN-13)', () => {
  it('waits for the rules to be saved first', () => {
    renderSection(draftView());

    expect(
      screen.getByText(
        'Save the rules and who can take part first, then add tracks.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save tracks' })).toBeNull();
  });

  it('builds an open-source track with its links and saves the list', () => {
    renderSection();

    fireEvent.change(screen.getByLabelText('Kind of track'), {
      target: { value: 'open_source' },
    });
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Open source' },
    });
    fireEvent.change(screen.getByLabelText('Brief'), {
      target: { value: BRIEF },
    });
    fireEvent.change(screen.getByLabelText('Link 1'), {
      target: { value: 'https://github.com/djazairdev/founders.coffee' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add a link' }));
    expect(document.activeElement?.id).toBe('hackathon-track-new-1-source-1');
    fireEvent.change(screen.getByLabelText('Link 2'), {
      target: {
        value: 'https://github.com/djazairdev/founders.coffee/issues/12',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save tracks' }));

    expect(mocks.save.mutate).toHaveBeenCalledWith({
      eventId: 'evt_draft',
      version: 1,
      tracks: [
        {
          id: null,
          track: {
            kind: 'open_source',
            title: 'Open source',
            brief: BRIEF,
            sourceUrls: [
              'https://github.com/djazairdev/founders.coffee',
              'https://github.com/djazairdev/founders.coffee/issues/12',
            ],
          },
        },
      ],
    });
  });

  it('reorders, removes and adds tracks, keeping saved ones by id', () => {
    renderSection(draftView({ details: savedDetails, tracks: saved }));

    fireEvent.click(screen.getByRole('button', { name: 'Move track 2 up' }));
    expect(titles()).toEqual(['Hiring', 'Payments']);
    fireEvent.click(screen.getByRole('button', { name: 'Remove track 2' }));
    expect(titles()).toEqual(['Hiring']);
    fireEvent.click(screen.getByRole('button', { name: 'Add a track' }));
    expect(document.activeElement?.id).toBe('hackathon-track-new-1-title');
    fireEvent.change(screen.getAllByLabelText('Title')[1] as HTMLElement, {
      target: { value: 'Logistics' },
    });
    fireEvent.change(screen.getAllByLabelText('Brief')[1] as HTMLElement, {
      target: { value: BRIEF },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save tracks' }));

    expect(mocks.save.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        tracks: [
          {
            id: 'trk_hiring',
            track: expect.objectContaining({ title: 'Hiring' }),
          },
          { id: null, track: expect.objectContaining({ title: 'Logistics' }) },
        ],
      }),
    );
  });

  it('takes the organiser to the first field holding the list back, and sends nothing', () => {
    renderSection();

    fireEvent.click(screen.getByRole('button', { name: 'Save tracks' }));

    expect(mocks.save.mutate).not.toHaveBeenCalled();
    expect(document.activeElement?.id).toBe('hackathon-track-new-1-title');
    expect(
      screen.getByText('Give the track a title of 3 to 100 characters.'),
    ).toBeTruthy();
  });

  it('keeps saved tracks once registration is open, and explains a refusal', () => {
    mocks.save.isError = true;
    mocks.save.error = { code: 'hackathon_track_has_prizes' };
    renderSection(
      draftView(
        { details: savedDetails, tracks: saved, stage: 'locked' },
        { status: 'published' },
      ),
    );

    expect(
      screen.getByText(
        'Registration is open, so saved tracks can be reworded but not removed.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Remove track/ })).toBeNull();
    expect(
      screen.getByText(
        'A prize names a track you removed. Change or remove that prize first.',
      ),
    ).toBeTruthy();
  });

  it('reads in Arabic', () => {
    renderSection(draftView({ details: savedDetails, tracks: saved }), 'ar');

    expect(screen.getByRole('heading', { name: 'المسارات' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'المسار 1' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'انقل المسار 2 إلى الأعلى' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'حفظ المسارات' })).toBeTruthy();
  });
});
