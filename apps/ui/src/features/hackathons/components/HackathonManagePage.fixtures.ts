import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { vi } from 'vitest';

import type { Locale } from '@founders-coffee/i18n';

import type { HackathonDraftView } from '../api';
import { HackathonManagePage } from './HackathonManagePage';

const mocks = vi.hoisted(() => ({
  draft: {
    data: undefined as HackathonDraftView | undefined,
    isError: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
  dashboard: {
    data: undefined,
    isError: false,
    refetch: vi.fn(),
  },
  saveTracks: {
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    data: undefined,
  },
  saveDeadlines: {
    mutate: vi.fn(
      (
        _request: unknown,
        _options?: {
          onSuccess?: () => void;
          onError?: (error: unknown) => void;
        },
      ) => undefined,
    ),
    reset: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null as unknown,
  },
  saveSettings: {
    mutate: vi.fn(
      (
        _request: unknown,
        _options?: {
          onSuccess?: () => void;
          onError?: (error: unknown) => void;
        },
      ) => undefined,
    ),
    reset: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null as unknown,
  },
  deletion: {
    mutate: vi.fn(
      (
        _eventId: string,
        _options?: {
          onSuccess?: () => void;
          onError?: (error: unknown) => void;
        },
      ) => undefined,
    ),
    isPending: false,
  },
}));

export const getManagePageMocks = () => mocks;

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => createElement('a', { href: '#', className }, children),
}));

vi.mock('../results-hooks', () => ({
  usePrizeDelivery: () => ({
    data: { isOpen: false, prizes: [], entries: [] },
  }),
  useAssignPrize: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useSetPrizeDelivery: () => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  }),
  useHackathonResults: () => ({
    data: undefined,
    isError: false,
    refetch: vi.fn(),
  }),
  usePublishHackathonResults: () => ({ mutate: vi.fn(), reset: vi.fn() }),
  useHackathonJudgingProgress: () => ({
    data: undefined,
    isError: false,
    refetch: vi.fn(),
  }),
  useRemindHackathonJudges: () => ({ mutate: vi.fn() }),
}));

vi.mock('./HackathonRoleRoster', () => ({ HackathonRoleRoster: () => null }));

vi.mock('../hooks', () => ({
  useHackathonDraft: () => mocks.draft,
  useHackathonDashboard: () => mocks.dashboard,
  useHackathonParticipants: () => ({ data: undefined, isError: false }),
  useHackathonTeams: () => ({ data: undefined, isError: false }),
  useSaveHackathonDeadlines: () => mocks.saveDeadlines,
  useSaveHackathonSettings: () => mocks.saveSettings,
  useSaveHackathonTracks: () => mocks.saveTracks,
  useSaveHackathonRubric: () => mocks.saveTracks,
  useAddHackathonPrize: () => mocks.saveTracks,
  useChangeHackathonPrize: () => mocks.saveTracks,
  useRemoveHackathonPrize: () => mocks.saveTracks,
  useConfirmHackathonPrize: () => mocks.saveTracks,
  useDeleteOwnedHackathon: () => mocks.deletion,
}));

const markets = [
  {
    code: 'DZ',
    slug: 'algeria',
    name: 'Algeria',
    nameAr: 'الجزائر',
    nameFr: 'Algérie',
    timezone: 'Africa/Algiers',
  },
] as never;

export const renderManagePage = (locale: Locale = 'en') =>
  render(
    createElement(HackathonManagePage, {
      eventId: 'evt_draft',
      locale,
      markets,
    }),
  );

export const fill = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

export const resetManagePage = () => {
  cleanup();
  vi.clearAllMocks();
  Object.assign(mocks.draft, { data: undefined, isError: false, error: null });
  for (const save of [mocks.saveDeadlines, mocks.saveSettings])
    Object.assign(save, {
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    });
  Object.assign(mocks.deletion, { isPending: false });
};
