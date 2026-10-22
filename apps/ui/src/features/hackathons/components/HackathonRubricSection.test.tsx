import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Locale } from '@founders-coffee/i18n';

import type { HackathonDraftView } from '../api';
import { draftView, savedDetails } from '../hackathon-details-form.fixtures';
import { HackathonRubricSection } from './HackathonRubricSection';

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
  useSaveHackathonRubric: () => mocks.save,
}));

const saved: HackathonDraftView['criteria'] = [
  {
    id: 'crt_impact',
    name: 'Impact',
    description: 'Who it helps, and how much it changes for them.',
    weight: 50,
    scale: 5,
  },
  {
    id: 'crt_craft',
    name: 'Craft',
    description: 'How well it is built, and whether it holds up.',
    weight: 30,
    scale: 5,
  },
  {
    id: 'crt_demo',
    name: 'Demo',
    description: 'How clearly the team shows what works today.',
    weight: 20,
    scale: 5,
  },
];

const renderSection = (
  draft: HackathonDraftView = draftView({ details: savedDetails }),
  locale: Locale = 'en',
) => render(<HackathonRubricSection draft={draft} locale={locale} />);

const fillCriterion = (index: number, name: string, weight: string) => {
  fireEvent.change(screen.getAllByLabelText('Name')[index] as HTMLElement, {
    target: { value: name },
  });
  fireEvent.change(
    screen.getAllByLabelText('What judges look for')[index] as HTMLElement,
    { target: { value: `How well the project does on ${name}.` } },
  );
  fireEvent.change(screen.getAllByLabelText('Weight')[index] as HTMLElement, {
    target: { value: weight },
  });
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  Object.assign(mocks.save, { isError: false, error: null });
});

describe('HackathonRubricSection (B-HKN-15)', () => {
  it('waits for the rules to be saved first', () => {
    renderSection(draftView());

    expect(
      screen.getByText(
        'Save the rules and who can take part first, then set the rubric.',
      ),
    ).toBeTruthy();
  });

  it('keeps a live total, and sends the rubric only once it reaches 100', () => {
    renderSection();

    fillCriterion(0, 'Impact', '40');
    fillCriterion(1, 'Craft', '30');
    fillCriterion(2, 'Demo', '20');
    expect(screen.getByRole('status').textContent).toBe('Total: 90 of 100');
    fireEvent.click(screen.getByRole('button', { name: 'Save the rubric' }));
    expect(mocks.save.mutate).not.toHaveBeenCalled();
    expect(
      screen.getByText('The weights add up to 90. Make them add up to 100.'),
    ).toBeTruthy();
    expect(document.activeElement?.id).toBe('hackathon-criterion-new-1-weight');

    fireEvent.change(screen.getAllByLabelText('Weight')[2] as HTMLElement, {
      target: { value: '30' },
    });
    fireEvent.click(screen.getByRole('radio', { name: 'From 1 to 5' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save the rubric' }));

    expect(mocks.save.mutate).toHaveBeenCalledWith({
      eventId: 'evt_draft',
      version: 1,
      criteria: [
        {
          id: null,
          criterion: expect.objectContaining({
            name: 'Impact',
            weight: 40,
            scale: 5,
          }),
        },
        {
          id: null,
          criterion: expect.objectContaining({
            name: 'Craft',
            weight: 30,
            scale: 5,
          }),
        },
        {
          id: null,
          criterion: expect.objectContaining({
            name: 'Demo',
            weight: 30,
            scale: 5,
          }),
        },
      ],
    });
  });

  it('adds a fourth criterion, then no more, and removes down to three', () => {
    renderSection(draftView({ details: savedDetails, criteria: saved }));

    expect(screen.getByRole('radio', { name: 'From 1 to 5' })).toHaveProperty(
      'checked',
      true,
    );
    expect(
      screen.queryByRole('button', { name: /^Remove criterion/ }),
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Add a criterion' }));
    expect(document.activeElement?.id).toBe('hackathon-criterion-new-1-name');
    expect(
      (
        screen.getByRole('button', {
          name: 'Add a criterion',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Remove criterion 2' }));
    expect(
      screen
        .getAllByLabelText('Name')
        .map((input) => (input as HTMLInputElement).value),
    ).toEqual(['Impact', 'Demo', '']);
  });

  it('shows the rubric as it stands once registration is open', () => {
    renderSection(
      draftView(
        { details: savedDetails, criteria: saved, stage: 'locked' },
        { status: 'published' },
      ),
    );

    expect(
      screen.getByText('Registration is open, so the rubric stays as it is.'),
    ).toBeTruthy();
    expect(screen.getByText('Impact')).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Save the rubric' }),
    ).toBeNull();
  });

  it('explains a refusal, and reads in Arabic', () => {
    mocks.save.isError = true;
    mocks.save.error = { code: 'hackathon_field_locked' };
    renderSection(draftView({ details: savedDetails, criteria: saved }), 'ar');

    expect(
      screen.getByRole('heading', { name: 'معايير التقييم' }),
    ).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('المجموع: 100 من 100');
    expect(
      screen.getByText('التسجيل مفتوح، لذا تبقى معايير التقييم كما هي.'),
    ).toBeTruthy();
  });
});
