import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppError } from '@founders-coffee/core';

import type { ProjectEditor } from '../api';
import { ProjectEditForm } from './ProjectEditForm';

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  reset: vi.fn(),
  state: { error: null, isError: false, isSuccess: false } as {
    error: unknown;
    isError: boolean;
    isSuccess: boolean;
  },
}));

vi.mock('../hooks', () => ({
  useSaveProject: () => ({
    mutate: mocks.mutate,
    reset: mocks.reset,
    isPending: false,
    ...mocks.state,
  }),
}));

const EDITOR: ProjectEditor = {
  id: 'prj_0123456789abcdef0123456789abcdef',
  slug: 'ledger-ab12cd34',
  title: 'Ledger',
  status: 'published',
  stage: 'prototype',
  description: 'A ledger for a corner shop.',
  repositoryUrl: 'https://github.com/team/ledger',
  demoUrl: null,
  websiteUrl: null,
  isSearchIndexable: false,
  version: 4,
  role: 'owner',
  canLeave: true,
};

const show = (onReload = vi.fn()) =>
  render(<ProjectEditForm editor={EDITOR} locale="en" onReload={onReload} />);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.state = { error: null, isError: false, isSuccess: false };
});

describe('ProjectEditForm (B-PRJ-04)', () => {
  it('starts from what is saved and sends the edit with its version', () => {
    show();
    expect(screen.getByLabelText('Stage')).toHaveProperty('value', 'prototype');

    fireEvent.change(screen.getByLabelText('Stage'), {
      target: { value: 'launched' },
    });
    fireEvent.change(screen.getByLabelText(/Website/u), {
      target: { value: 'https://ledger.example' },
    });
    fireEvent.change(screen.getByLabelText(/Source code/u), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByLabelText('Let search engines list this page'));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(mocks.mutate).toHaveBeenCalledWith({
      projectId: EDITOR.id,
      expectedVersion: 4,
      stage: 'launched',
      description: 'A ledger for a corner shop.',
      repositoryUrl: null,
      demoUrl: null,
      websiteUrl: 'https://ledger.example',
      isSearchIndexable: true,
    });
  });

  it('says which link it refused, moves focus there and sends nothing', () => {
    show();
    const demo = screen.getByLabelText(/Demo/u);
    fireEvent.change(demo, { target: { value: 'http://insecure.example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(screen.getByText(/Enter a full https:\/\/ link/u)).toBeTruthy();
    expect(document.activeElement).toBe(demo);
    expect(demo.getAttribute('aria-invalid')).toBe('true');
    expect(
      document.getElementById(demo.getAttribute('aria-describedby') ?? '')
        ?.textContent,
    ).toContain('https://');
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it('offers a reload when a teammate saved first', () => {
    mocks.state = {
      error: new AppError('stale_version', 'Changed'),
      isError: true,
      isSuccess: false,
    };
    const onReload = vi.fn();
    show(onReload);

    expect(
      screen.getByText(/changed this page after you opened it/u),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(onReload).toHaveBeenCalled();
  });

  it('confirms a save, and says so when it fails for another reason', () => {
    mocks.state = { error: null, isError: false, isSuccess: true };
    const { unmount } = show();
    expect(screen.getByText('Your changes are saved.')).toBeTruthy();
    unmount();

    mocks.state = {
      error: new AppError('rate_limited', 'Slow down'),
      isError: true,
      isSuccess: false,
    };
    show();
    expect(
      screen.getByText('Your changes could not be saved. Try again.'),
    ).toBeTruthy();
  });

  it('keeps the save button focusable, so a press never drops keyboard focus', () => {
    show();
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Save changes' })
        .disabled,
    ).toBe(false);
  });
});
