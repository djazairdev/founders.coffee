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
const nextArabic = () =>
  fireEvent.click(screen.getByRole('button', { name: 'التالي' }));

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

  it('collects a remote join link in the last step and saves no city or venue', () => {
    renderHackathonWizard();

    expect(
      (screen.getByRole('radio', { name: 'Remote' }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    expect(
      screen
        .getAllByRole('radio')
        .map((radio) => (radio as HTMLInputElement).value),
    ).toEqual(['online', 'in_person']);
    expect(
      screen.queryByRole('radio', { name: 'In person and remote' }),
    ).toBeNull();
    expect(mocks.mapContext).toHaveBeenLastCalledWith(false);
    expect(screen.queryByLabelText('Remote join link')).toBeNull();
    expect(screen.queryByLabelText('City')).toBeNull();
    next();
    expect(
      screen.getByRole('heading', {
        name: 'When will the hackathon take place?',
      }),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Remote join link')).toBeNull();
    expect(screen.queryByLabelText('City')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Set schedule' }));
    next();
    fireEvent.change(screen.getByLabelText('Remote join link'), {
      target: { value: 'https://meet.example.com/builders' },
    });
    fillDetails();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    const [request] = mocks.mutate.mock.calls[0] ?? [];
    expect(request).toEqual({
      organisationId: 'org_1',
      hackathon: {
        marketCode: 'DZ',
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

  it('opens the saved draft’s second step', async () => {
    mocks.mutate.mockImplementation(
      (_request: unknown, options: { onSuccess: (created: unknown) => void }) =>
        options.onSuccess({ eventId: 'evt_saved', slug: 'algiers-builders' }),
    );
    renderHackathonWizard();

    fireEvent.click(screen.getByRole('radio', { name: 'In person' }));
    expect(mocks.mapContext).toHaveBeenLastCalledWith(true);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Choose venue' }),
    );
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

    fireEvent.click(screen.getByRole('radio', { name: 'In person' }));
    next();
    expect(
      screen.getByRole('heading', { name: 'How will the hackathon be held?' }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Choose venue' }));
    next();
    next();
    expect(
      screen.getByRole('heading', {
        name: 'When will the hackathon take place?',
      }),
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
        'Only members of an active organiser account can create its hackathons.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
  });

  it('asks in Arabic and French too', () => {
    renderHackathonWizard('ar');
    expect(
      screen.getByRole('heading', { name: 'كيف سيُقام الهاكاثون؟' }),
    ).toBeTruthy();
    resetHackathonWizard();

    renderHackathonWizard('fr');
    expect(
      screen.getByRole('heading', {
        name: 'Comment se déroulera le hackathon ?',
      }),
    ).toBeTruthy();
  });

  it('shows format-specific guidance and fields', () => {
    renderHackathonWizard('ar');

    expect(
      (screen.getByRole('radio', { name: 'عن بُعد' }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    expect(screen.queryByRole('radio', { name: 'حضوري وعن بُعد' })).toBeNull();
    expect(
      screen.queryByRole('heading', { name: 'مكان إقامة الهاكاثون' }),
    ).toBeNull();
    expect(mocks.mapContext).toHaveBeenLastCalledWith(false);
    expect(
      screen.getByText('يشارك المتسابقون عبر الإنترنت دون الحاجة إلى الحضور.'),
    ).toBeTruthy();
    expect(screen.queryByLabelText('رابط الانضمام عن بُعد')).toBeNull();
    expect(screen.queryByLabelText('المدينة')).toBeNull();
    nextArabic();
    fireEvent.click(screen.getByRole('button', { name: 'Set schedule' }));
    nextArabic();
    expect(screen.getByLabelText('رابط الانضمام عن بُعد')).toBeTruthy();

    resetHackathonWizard();
    renderHackathonWizard('ar');
    fireEvent.click(screen.getByRole('radio', { name: 'حضوري' }));
    expect(mocks.mapContext).toHaveBeenLastCalledWith(true);
    expect(
      screen.getByRole('heading', { name: 'مكان إقامة الهاكاثون' }),
    ).toBeTruthy();
    expect(screen.queryByLabelText('رابط الانضمام عن بُعد')).toBeNull();
    expect(screen.getByText('حدّد الموقع على الخريطة.')).toBeTruthy();
  });
});
