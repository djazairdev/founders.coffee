import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppError, type HackathonAiPolicy } from '@founders-coffee/core';
import type { Locale } from '@founders-coffee/i18n';

import type { SubmissionPageView } from '../api';
import { submissionView } from '../submission-page.fixtures';
import { EVENT_ID, mutation } from '../team-page.fixtures';
import { HackathonSubmissionForm } from './HackathonSubmissionForm';

const mocks = vi.hoisted(() => ({
  save: undefined as
    ReturnType<typeof import('../team-page.fixtures').mutation> | undefined,
  send: undefined as
    ReturnType<typeof import('../team-page.fixtures').mutation> | undefined,
}));

vi.mock('../submission-hooks', () => ({
  useSaveSubmissionDraft: () => {
    mocks.save ??= mutation();
    return mocks.save;
  },
  useSubmitSubmission: () => {
    mocks.send ??= mutation();
    return mocks.send;
  },
}));

afterEach(() => {
  cleanup();
  mocks.save = undefined;
  mocks.send = undefined;
});

type Entry = Partial<NonNullable<SubmissionPageView['entry']>> | null;

const renderForm = ({
  entry = {},
  aiPolicy = 'disclosed',
  isOpen = true,
  locale = 'en',
}: {
  entry?: Entry;
  aiPolicy?: HackathonAiPolicy;
  isOpen?: boolean;
  locale?: Locale;
} = {}) => {
  const view = submissionView({ aiPolicy }, entry);
  return render(
    <HackathonSubmissionForm
      eventId={EVENT_ID}
      tracks={view.tracks}
      entry={view.entry}
      aiPolicy={aiPolicy}
      isReadOnly={!isOpen}
      isOpen={isOpen}
      locale={locale}
      timeZone="Africa/Algiers"
    />,
  );
};

const field = (name: string) =>
  screen.getByLabelText(name, { exact: false }) as HTMLInputElement;

const attest = () =>
  fireEvent.click(
    screen.getByLabelText('We confirm this project is our team’s own work.'),
  );

const submitButton = () =>
  screen.getByRole('button', { name: 'Submit the project' });

describe('HackathonSubmissionForm (B-SUB-06)', () => {
  it('words the AI section by the hackathon’s policy, asking for the tools only when built around AI', () => {
    renderForm();
    expect(screen.getByRole('heading', { name: 'AI use' })).toBeTruthy();
    expect(screen.getByText(/^Name any AI tools you used/u)).toBeTruthy();
    expect(field('AI tools').value).toBe('Copilot');
    expect(screen.getByText('AI tools').textContent).toContain('(optional)');
    cleanup();

    renderForm({ aiPolicy: 'ai_native' });
    expect(
      screen.getByText(/^This hackathon is built around AI/u),
    ).toBeTruthy();
    expect(screen.getByText('AI tools').textContent).not.toContain(
      '(optional)',
    );
    cleanup();

    renderForm({ aiPolicy: 'restricted' });
    expect(screen.getByText(/^This hackathon limits AI use/u)).toBeTruthy();
  });

  it('submits a saved project that has not changed at the version the captain saw', () => {
    renderForm();
    attest();
    fireEvent.click(submitButton());

    expect(mocks.save?.mutate).not.toHaveBeenCalled();
    expect(mocks.send?.mutate).toHaveBeenCalledWith(3, expect.anything());
  });

  it('saves what changed first, then submits at the version the save left', () => {
    renderForm();
    fireEvent.change(field('AI statement'), {
      target: { value: 'We wrote every line; Copilot suggested tests.' },
    });
    attest();
    fireEvent.click(submitButton());

    expect(mocks.send?.mutate).not.toHaveBeenCalled();
    const [request, callbacks] = mocks.save?.mutate.mock.calls[0] ?? [];
    expect(request).toEqual({
      version: 3,
      draft: expect.objectContaining({
        aiTools: ['Copilot'],
        aiStatement: 'We wrote every line; Copilot suggested tests.',
      }),
    });
    callbacks.onSuccess({ version: 4 });
    expect(mocks.send?.mutate).toHaveBeenCalledWith(4, expect.anything());
  });

  it('asks for the original-work statement and takes the captain to it', () => {
    renderForm();
    fireEvent.click(submitButton());

    expect(
      screen.getByText(
        'Confirm the project is your team’s own work to submit it.',
      ),
    ).toBeTruthy();
    expect(document.activeElement?.id).toBe('hackathon-submission-original');
    expect(mocks.send?.mutate).not.toHaveBeenCalled();
    expect(mocks.save?.mutate).not.toHaveBeenCalled();
  });

  it('names what a submission still needs, the first field taking the focus', () => {
    renderForm({
      entry: { repositoryUrl: null, aiTools: [], aiStatement: null },
      aiPolicy: 'ai_native',
    });
    attest();
    fireEvent.click(submitButton());

    expect(
      screen.getByText('Add the link to the code repository.'),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Name at least one AI tool: this hackathon is built around AI.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText('Write an AI statement of 20 to 1000 characters.'),
    ).toBeTruthy();
    expect(document.activeElement).toBe(field('Code repository'));
    expect(mocks.send?.mutate).not.toHaveBeenCalled();
  });

  it('names everything an empty project needs at once, from the track down', () => {
    renderForm({ entry: null });
    fireEvent.click(submitButton());

    for (const message of [
      'Choose one of this hackathon’s tracks.',
      'Give the project a name of 3 to 100 characters.',
      'Describe the project in 20 to 2000 characters.',
      'Add the link to the code repository.',
      'Write an AI statement of 20 to 1000 characters.',
      'Confirm the project is your team’s own work to submit it.',
    ])
      expect(screen.getByText(message)).toBeTruthy();
    expect(document.activeElement?.id).toBe('hackathon-submission-track');
    expect(mocks.save?.mutate).not.toHaveBeenCalled();
  });

  it('keeps the link message for a repository that is not HTTPS', () => {
    renderForm();
    fireEvent.change(field('Code repository'), {
      target: { value: 'http://github.com/byte-club/ledger' },
    });
    attest();
    fireEvent.click(submitButton());

    expect(
      screen.getByText('Use a full link that starts with https://.'),
    ).toBeTruthy();
    expect(
      screen.queryByText('Add the link to the code repository.'),
    ).toBeNull();
    expect(mocks.save?.mutate).not.toHaveBeenCalled();
  });

  it('checks the AI tools one per line before anything is sent', () => {
    renderForm();
    fireEvent.change(field('AI tools'), {
      target: { value: `Copilot\n${'x'.repeat(61)}` },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      screen.getByText(
        'Name up to 10 tools, one per line, each under 60 characters.',
      ),
    ).toBeTruthy();
    expect(mocks.save?.mutate).not.toHaveBeenCalled();
  });

  it('says when the project was submitted, and lets the captain submit again while it is open', () => {
    const submittedAt = Date.parse('2099-03-14T08:30:00Z');
    renderForm({ entry: { status: 'submitted', submittedAt } });
    expect(screen.getByText(/^Submitted Sat, Mar 14, 09:30\./u)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Submit again' })).toBeTruthy();
    cleanup();

    renderForm({ entry: { status: 'submitted', submittedAt }, isOpen: false });
    expect(screen.getByText('Submitted Sat, Mar 14, 09:30.')).toBeTruthy();
    expect(field('AI statement').readOnly).toBe(true);
    expect(screen.queryByRole('button', { name: 'Submit again' })).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('says why a submit was refused', () => {
    mocks.send = {
      ...mutation(),
      isError: true,
      error: new AppError('ai_tools_required', 'Tools'),
    };
    renderForm({ aiPolicy: 'ai_native' });

    expect(
      screen.getByText(
        'Name at least one AI tool: this hackathon is built around AI.',
      ),
    ).toBeTruthy();
  });

  it('reads in Arabic', () => {
    renderForm({ locale: 'ar' });

    expect(
      screen.getByRole('heading', { name: 'استخدام الذكاء الاصطناعي' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'تسليم المشروع' })).toBeTruthy();
    expect(
      screen.getByLabelText('نؤكّد أن هذا المشروع من عمل فريقنا.'),
    ).toBeTruthy();
  });
});
