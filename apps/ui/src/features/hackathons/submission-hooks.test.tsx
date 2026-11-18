import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';

import { submissionsApi, type SubmissionPageView } from './api';
import { useSubmissionPage } from './submission-hooks';
import { submissionView } from './submission-page.fixtures';

vi.mock('./api', () => ({ submissionsApi: { page: vi.fn() } }));

const openPage = (data: SubmissionPageView) => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: false } },
  });
  client.setQueryData(['hackathons', 'submission', data.event.id], data);
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useSubmissionPage(data.event.id), {
    wrapper: Wrapper,
  });
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.resetAllMocks();
});

it('locks an open submission immediately at cutoff while the server refresh is pending', async () => {
  vi.useFakeTimers();
  const view = submissionView();
  vi.setSystemTime(view.submissionDeadlineAt - 1_000);
  const page = vi.mocked(submissionsApi.page);
  page.mockImplementation(
    () => new Promise<SubmissionPageView>(() => undefined),
  );
  const { result } = openPage(view);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(999);
  });
  expect(result.current.data?.stage).toBe('building');
  expect(page).not.toHaveBeenCalled();

  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(result.current.data?.stage).toBe('closed');
  expect(result.current.data?.entry).toEqual(view.entry);
  expect(page).toHaveBeenCalledOnce();
});

it('asks the server to open a submission form at kickoff', async () => {
  vi.useFakeTimers();
  const view = submissionView({ stage: 'not_started' });
  vi.setSystemTime(view.kickoffAt - 1_000);
  const page = vi.mocked(submissionsApi.page);
  page.mockResolvedValue({ ...view, stage: 'building' });
  const { result } = openPage(view);
  expect(result.current.data?.stage).toBe('not_started');

  await act(async () => {
    await vi.advanceTimersByTimeAsync(1_010);
  });
  expect(result.current.data?.stage).toBe('building');
  expect(page).toHaveBeenCalledOnce();
});
