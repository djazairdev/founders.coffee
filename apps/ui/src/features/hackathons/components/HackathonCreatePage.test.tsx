import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  DEMO_DAY,
  getHackathonCreateMocks,
  KICKOFF,
  renderHackathonWizard,
  resetHackathonWizard,
} from './HackathonCreatePage.fixtures';

const mocks = getHackathonCreateMocks();
const next = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));

const fillDetails = () => {
  fireEvent.change(screen.getByLabelText('Hackathon title'), {
    target: { value: 'Algiers Builders Weekend' },
  });
  fireEvent.change(screen.getByLabelText('Hackathon description'), {
    target: { value: 'Two days of building with founders across Algiers.' },
  });
};

describe('the hackathon wizard, step 1 (B-HKN-11)', () => {
  afterEach(resetHackathonWizard);

  it('saves an online hackathon as a draft with its link and city, and no venue', () => {
    renderHackathonWizard();

    fireEvent.click(screen.getByRole('radio', { name: 'Online' }));
    fireEvent.change(screen.getByLabelText('Meeting link'), {
      target: { value: 'https://meet.example.com/builders' },
    });
    next();
    expect(
      screen.getByRole('heading', { name: 'When does it run?' }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Set schedule' }));
    next();
    fillDetails();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    const [request] = mocks.mutate.mock.calls[0] ?? [];
    expect(request).toEqual({
      organisationId: 'org_1',
      hackathon: {
        marketCode: 'DZ',
        cityCode: '1',
        title: 'Algiers Builders Weekend',
        description: 'Two days of building with founders across Algiers.',
        languages: ['en'],
        tags: [],
        startsAt: KICKOFF,
        endsAt: DEMO_DAY,
        format: 'online',
        meetingUrl: 'https://meet.example.com/builders',
      },
    });
  });

  it('opens the saved draft’s second step', () => {
    mocks.mutate.mockImplementation(
      (_request: unknown, options: { onSuccess: (created: unknown) => void }) =>
        options.onSuccess({ eventId: 'evt_saved', slug: 'algiers-builders' }),
    );
    renderHackathonWizard();

    fireEvent.click(screen.getByRole('button', { name: 'Choose venue' }));
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Set schedule' }));
    next();
    fillDetails();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    const [request] = mocks.mutate.mock.calls[0] ?? [];
    expect(request).toMatchObject({
      hackathon: {
        format: 'in_person',
        venueName: 'Founders Café',
        venueProviderId: 'poi-cafe',
      },
    });
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/$locale/hackathon/$eventId/manage',
      params: { locale: 'en', eventId: 'evt_saved' },
      search: { created: true },
    });
  });

  it('holds each step until it is complete', () => {
    renderHackathonWizard();

    next();
    expect(
      screen.getByRole('heading', { name: 'Where will the hackathon happen?' }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Choose venue' }));
    next();
    next();
    expect(
      screen.getByRole('heading', { name: 'When does it run?' }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Set schedule' }));
    next();
    expect(
      screen.getByText(/^The languages spoken at the hackathon/),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it('says why a draft was not saved', () => {
    mocks.save.isError = true;
    mocks.save.error = { code: 'rate_limited' };
    renderHackathonWizard();

    expect(
      screen.getByText(
        'You have created several events recently. Wait a few minutes, then try again.',
      ),
    ).toBeTruthy();
  });

  it('offers nothing to a member who cannot create one', () => {
    renderHackathonWizard('en', { canCreateHackathon: false });

    expect(
      screen.getByText(
        'Only members of an approved organisation can create its hackathons.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
  });

  it('asks in Arabic and French too', () => {
    renderHackathonWizard('ar');
    expect(
      screen.getByRole('heading', { name: 'أين سيُقام الهاكاثون؟' }),
    ).toBeTruthy();
    resetHackathonWizard();

    renderHackathonWizard('fr');
    expect(
      screen.getByRole('heading', { name: 'Où se déroulera le hackathon ?' }),
    ).toBeTruthy();
  });
});
