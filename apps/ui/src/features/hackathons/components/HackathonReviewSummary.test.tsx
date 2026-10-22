import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { Locale } from '@founders-coffee/i18n';

import type { HackathonDraftView } from '../api';
import { draftView, savedDetails } from '../hackathon-details-form.fixtures';
import { HackathonReviewSummary } from './HackathonReviewSummary';

const complete = (
  changes: Partial<HackathonDraftView> = {},
): HackathonDraftView =>
  draftView({
    review: { status: 'draft', note: null, gaps: [] },
    details: { ...savedDetails, capacity: 120 },
    tracks: [
      {
        id: 'trk_1',
        kind: 'founder_problem',
        title: 'Payments for corner shops',
        brief: 'Brief.',
        partnerName: null,
        sourceUrls: [],
      },
    ],
    prizes: [
      {
        id: 'prz_1',
        trackId: null,
        place: 1,
        title: 'Cloud credits',
        description: 'Credits.',
        providerName: 'Oran Makers',
        value: null,
        confirmation: { confirmedAt: 1, note: 'Signed.' },
      },
      {
        id: 'prz_2',
        trackId: null,
        place: 2,
        title: 'Mentoring',
        description: 'Hours.',
        providerName: 'Oran Makers',
        value: null,
        confirmation: null,
      },
    ],
    criteria: [
      {
        id: 'crt_1',
        name: 'Impact',
        description: 'Who it helps.',
        weight: 60,
        scale: 10,
      },
      {
        id: 'crt_2',
        name: 'Execution',
        description: 'How well it works.',
        weight: 40,
        scale: 10,
      },
    ],
    ...changes,
  });

const renderSummary = (draft: HackathonDraftView, locale: Locale = 'en') =>
  render(
    <HackathonReviewSummary
      draft={draft}
      locale={locale}
      timeZone="Africa/Algiers"
    />,
  );

const valueOf = (label: string) =>
  screen.getByText(label).nextElementSibling?.textContent;

afterEach(cleanup);

describe('HackathonReviewSummary (B-HKN-16)', () => {
  it('sums up everything the reviewers will read, on the hackathon’s clock', () => {
    renderSummary(complete());

    expect(valueOf('Registration opens')).toBe('Sun, Feb 1, 09:00');
    expect(valueOf('Kickoff')).toBe('Thu, Mar 12, 09:00');
    expect(valueOf('Judging ends')).toBe('Sat, Mar 21, 18:00');
    expect(valueOf('How people take part')).toBe('Online');
    expect(valueOf('Who can take part')).toBe('Teams have 2 to 5 people.');
    expect(valueOf('Places')).toBe('120');
    expect(valueOf('Minimum age')).toBe('18');
    expect(valueOf('AI policy')).toBe('Allowed with disclosure');
    expect(screen.getByText('Payments for corner shops')).toBeTruthy();
    expect(screen.getByText('Cloud credits')).toBeTruthy();
    expect(screen.getByText('Confirmed: 1 of 2')).toBeTruthy();
    expect(screen.getByText('Impact').nextElementSibling?.textContent).toBe(
      '60%',
    );
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('says what is left open without calling it missing', () => {
    renderSummary(
      complete({
        details: { ...savedDetails, capacity: null, minimumAge: null },
        prizes: [],
      }),
    );

    expect(valueOf('Places')).toBe('No limit');
    expect(valueOf('Minimum age')).toBe('None');
    expect(screen.getByText('None yet. Prizes are optional.')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('links each missing part to where it is filled in', () => {
    renderSummary(
      draftView({
        criteria: complete().criteria.slice(0, 1),
      }),
    );

    const targets = screen
      .getAllByRole('link', { name: 'Missing. Add it' })
      .map((link) => link.getAttribute('href'));
    expect(targets).toEqual([
      '#hackathon-details-heading',
      '#hackathon-tracks-heading',
      '#hackathon-rubric-heading',
    ]);
    expect(screen.getByText('Impact')).toBeTruthy();
  });

  it('reads in Arabic', () => {
    renderSummary(complete(), 'ar');

    const summary = screen.getByRole('region', { name: 'ما سترسله' });
    expect(within(summary).getByText('المؤكدة: 1 من 2')).toBeTruthy();
    expect(within(summary).getByText('عبر الإنترنت')).toBeTruthy();
  });
});
