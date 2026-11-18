import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppError } from '@founders-coffee/core';

import type { ProjectEditor } from '../api';
import { ProjectLeave } from './ProjectLeave';

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  state: { error: null, isError: false } as {
    error: unknown;
    isError: boolean;
  },
}));

vi.mock('../hooks', () => ({
  useLeaveProject: () => ({
    mutate: mocks.mutate,
    isPending: false,
    ...mocks.state,
  }),
}));

const EDITOR = {
  id: 'prj_1',
  role: 'member',
  canLeave: true,
} as ProjectEditor;

const show = (editor: ProjectEditor = EDITOR, onLeft = vi.fn()) =>
  render(<ProjectLeave editor={editor} locale="en" onLeft={onLeft} />);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.state = { error: null, isError: false };
});

describe('ProjectLeave (B-PRJ-04)', () => {
  it('asks first, then leaves and says so', () => {
    const onLeft = vi.fn();
    mocks.mutate.mockImplementation(
      (_id: string, handlers: { onSuccess: () => void }) =>
        handlers.onSuccess(),
    );
    show(EDITOR, onLeft);
    expect(mocks.mutate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Leave the project' }));
    expect(screen.getByText('Leave this project?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Leave the project' }));

    expect(mocks.mutate).toHaveBeenCalledWith('prj_1', expect.anything());
    expect(onLeft).toHaveBeenCalled();
  });

  it('can be cancelled', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Leave the project' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Leave this project?')).toBeNull();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it('tells an owner what happens to the project', () => {
    show({ ...EDITOR, role: 'owner' });
    expect(screen.getByText(/a teammate becomes its owner/u)).toBeTruthy();
  });

  it('offers no way out to the last person on it', () => {
    show({ ...EDITOR, role: 'owner', canLeave: false });
    expect(screen.getByText(/You are the only person/u)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('says so when the last teammate left meanwhile', () => {
    mocks.state = {
      error: new AppError('project_last_member', 'Nobody else'),
      isError: true,
    };
    show();
    expect(screen.getByText(/You are the only person/u)).toBeTruthy();
  });
});
