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

const fillTitle = () => {
  fireEvent.change(screen.getByLabelText('Hackathon title'), {
    target: { value: 'Algiers Builders Weekend' },
  });
};

const selectRequiredClassifications = () => {
  fireEvent.click(
    screen.getByRole('button', { name: 'Artificial intelligence' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Open topic' }));
};

const fillDescription = () => {
  fireEvent.change(screen.getByLabelText('Hackathon description'), {
    target: {
      value:
        '# Algiers Builders Weekend\n\nTwo days of **building** with founders across Algiers.',
    },
  });
};

describe('the hackathon wizard, step 1 (B-HKN-11)', () => {
  afterEach(resetHackathonWizard);

  it('saves an online hackathon without a city, venue, or external meeting link', () => {
    renderHackathonWizard();

    expect(
      (screen.getByRole('radio', { name: 'Remote' }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    expect(
      screen
        .getAllByRole('radio')
        .map((radio) => (radio as HTMLInputElement).value)
        .filter((value) => value === 'online' || value === 'in_person'),
    ).toEqual(['online', 'in_person']);
    expect(
      screen.queryByRole('radio', { name: 'In person and remote' }),
    ).toBeNull();
    expect(mocks.mapContext).toHaveBeenLastCalledWith(false);
    expect(screen.queryByLabelText('Remote join link')).toBeNull();
    expect(screen.queryByLabelText('City')).toBeNull();
    const titleInput = screen.getByLabelText('Hackathon title');
    expect(titleInput.getAttribute('placeholder')).toBeNull();
    const remoteOption = screen.getByRole('radio', { name: 'Remote' });
    expect(
      titleInput.compareDocumentPosition(remoteOption) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Artificial intelligence' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Web development' }));
    fireEvent.click(screen.getByRole('button', { name: 'Beginner friendly' }));
    fireEvent.click(screen.getByRole('button', { name: 'No code' }));
    fillTitle();
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
    expect(screen.queryByLabelText('Remote join link')).toBeNull();
    expect(
      screen.queryByText(/^The languages spoken at the hackathon/),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Artificial intelligence' }),
    ).toBeNull();
    expect(screen.queryByText('Add the final details.')).toBeNull();
    expect(screen.queryByText(/of 2000 characters/)).toBeNull();
    fillDescription();
    expect(
      (screen.getByLabelText('Hackathon description') as HTMLTextAreaElement)
        .value,
    ).toContain('**building**');
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    const [request] = mocks.mutate.mock.calls[0] ?? [];
    expect(request).toEqual({
      organisationId: 'org_1',
      hackathon: {
        marketCode: 'DZ',
        title: 'Algiers Builders Weekend',
        description:
          '# Algiers Builders Weekend\n\nTwo days of **building** with founders across Algiers.',
        languages: ['en'],
        tags: [],
        hackathonFields: ['artificial_intelligence', 'web_development'],
        hackathonTypeTags: ['beginner_friendly', 'no_code'],
        startsAt: KICKOFF,
        endsAt: DEMO_DAY,
        format: 'online',
      },
    });
  });

  it('accepts a 20,000-character description and rejects longer text', () => {
    renderHackathonWizard();
    selectRequiredClassifications();
    fillTitle();
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Set schedule' }));
    next();
    fireEvent.change(screen.getByLabelText('Hackathon description'), {
      target: { value: 'x'.repeat(20_001) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(mocks.mutate).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        'The description must be between 10 and 20000 characters.',
      ),
    ).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Hackathon description'), {
      target: { value: 'x'.repeat(20_000) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(mocks.mutate).toHaveBeenCalledTimes(1);
  });

  it('opens the saved draft’s second step', async () => {
    mocks.mutate.mockImplementation(
      (_request: unknown, options: { onSuccess: (created: unknown) => void }) =>
        options.onSuccess({ eventId: 'evt_saved', slug: 'algiers-builders' }),
    );
    renderHackathonWizard();

    fireEvent.click(screen.getByRole('radio', { name: 'In person' }));
    expect(mocks.mapContext).toHaveBeenLastCalledWith(true);
    selectRequiredClassifications();
    fillTitle();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Choose venue' }),
    );
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Set schedule' }));
    next();
    fillDescription();
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
    fillTitle();
    selectRequiredClassifications();
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
      screen.queryByText(/^The languages spoken at the hackathon/),
    ).toBeNull();
    fireEvent.change(screen.getByLabelText('Hackathon description'), {
      target: { value: '' },
    });
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
    fireEvent.change(screen.getByLabelText('عنوان الهاكاثون'), {
      target: { value: 'هاكاثون الجزائر' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'الذكاء الاصطناعي' }));
    fireEvent.click(screen.getByRole('button', { name: 'مفتوح المواضيع' }));
    nextArabic();
    fireEvent.click(screen.getByRole('button', { name: 'Set schedule' }));
    nextArabic();
    expect(screen.queryByLabelText('رابط الانضمام عن بُعد')).toBeNull();

    resetHackathonWizard();
    renderHackathonWizard('ar');
    fireEvent.change(screen.getByLabelText('عنوان الهاكاثون'), {
      target: { value: 'هاكاثون الجزائر' },
    });
    fireEvent.click(screen.getByRole('radio', { name: 'حضوري' }));
    fireEvent.click(screen.getByRole('button', { name: 'الذكاء الاصطناعي' }));
    fireEvent.click(screen.getByRole('button', { name: 'مفتوح المواضيع' }));
    expect(mocks.mapContext).toHaveBeenLastCalledWith(true);
    expect(
      screen.getByRole('heading', { name: 'مكان إقامة الهاكاثون' }),
    ).toBeTruthy();
    expect(screen.queryByLabelText('رابط الانضمام عن بُعد')).toBeNull();
    expect(screen.getByText('حدّد الموقع على الخريطة.')).toBeTruthy();
  });
});
