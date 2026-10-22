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
  submit: {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null as unknown,
  },
  save: {
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null as unknown,
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

vi.mock('../hooks', () => ({
  useHackathonDraft: () => mocks.draft,
  useHackathonDashboard: () => mocks.dashboard,
  useSaveHackathonDetails: () => mocks.save,
  useSaveHackathonTracks: () => mocks.saveTracks,
  useSaveHackathonRubric: () => mocks.saveTracks,
  useSubmitHackathonForReview: () => mocks.submit,
  useAddHackathonPrize: () => mocks.saveTracks,
  useChangeHackathonPrize: () => mocks.saveTracks,
  useRemoveHackathonPrize: () => mocks.saveTracks,
  useConfirmHackathonPrize: () => mocks.saveTracks,
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

export const renderManagePage = (
  locale: Locale = 'en',
  isJustCreated = false,
) =>
  render(
    createElement(HackathonManagePage, {
      eventId: 'evt_draft',
      locale,
      markets,
      isJustCreated,
    }),
  );

export const fill = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

export const resetManagePage = () => {
  cleanup();
  vi.clearAllMocks();
  Object.assign(mocks.draft, { data: undefined, isError: false, error: null });
  Object.assign(mocks.save, {
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
  });
};
