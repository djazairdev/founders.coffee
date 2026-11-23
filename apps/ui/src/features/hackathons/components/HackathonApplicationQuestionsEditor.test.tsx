import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HackathonApplicationQuestionsEditor } from './HackathonApplicationQuestionsEditor';

const mocks = vi.hoisted(() => ({
  save: {
    mutate: vi.fn(
      (
        _request: unknown,
        _options?: { onSuccess?: () => void; onError?: () => void },
      ) => undefined,
    ),
    isPending: false,
  },
}));

vi.mock('../hooks', () => ({
  useSaveHackathonApplicationQuestions: () => mocks.save,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.save.isPending = false;
});

const renderEditor = (canEdit = true) =>
  render(
    <HackathonApplicationQuestionsEditor
      eventId="evt_builders"
      version={3}
      questions={[]}
      canEdit={canEdit}
      locale="en"
    />,
  );

describe('HackathonApplicationQuestionsEditor', () => {
  it('builds and saves a required team-choice question', () => {
    renderEditor();

    fireEvent.click(screen.getByRole('button', { name: 'Add a question' }));
    fireEvent.change(screen.getByLabelText('Question'), {
      target: { value: 'Preferred platform' },
    });
    fireEvent.change(screen.getByLabelText('Answer type'), {
      target: { value: 'single_choice' },
    });
    fireEvent.change(screen.getByLabelText('Who answers this?'), {
      target: { value: 'team' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /Answer choices/ }), {
      target: { value: 'Web\nMobile' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Optional' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save questions' }));

    expect(mocks.save.mutate).toHaveBeenCalledWith(
      {
        eventId: 'evt_builders',
        version: 3,
        questions: [
          expect.objectContaining({
            scope: 'team',
            type: 'single_choice',
            label: 'Preferred platform',
            isRequired: true,
            options: ['Web', 'Mobile'],
          }),
        ],
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    act(() => mocks.save.mutate.mock.lastCall?.[1]?.onSuccess?.());
    expect(screen.getByText('Questions saved.')).toBeTruthy();
  });

  it('blocks invalid questions and explains when the editor is locked', () => {
    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Add a question' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save questions' }));

    expect(mocks.save.mutate).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        'Questions could not be saved. Check the form and try again.',
      ),
    ).toBeTruthy();
    cleanup();

    renderEditor(false);
    expect(
      screen.getByText(
        'Questions can be edited after registration dates are saved and before registration opens.',
      ),
    ).toBeTruthy();
    expect(
      (
        screen.getByRole('button', {
          name: 'Add a question',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});
