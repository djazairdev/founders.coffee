import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';

import { createQueryClient } from '../../lib/query-client';
import { hackathonsApi } from './api';
import { draftView, savedDetails } from './hackathon-details-form.fixtures';
import { useHackathonDraft } from './hooks';

vi.mock('./api', () => ({ hackathonsApi: { draft: vi.fn() } }));

afterEach(() => {
  cleanup();
  focusManager.setFocused(undefined);
  vi.resetAllMocks();
});

it('reads the review decision when the organiser returns to the tab', async () => {
  const draft = vi.mocked(hackathonsApi.draft);
  draft.mockResolvedValueOnce(
    draftView({
      details: savedDetails,
      isEditable: false,
      review: { status: 'submitted', note: null },
    }),
  );
  draft.mockResolvedValueOnce(
    draftView(
      {
        details: savedDetails,
        review: { status: 'approved', note: null },
      },
      { status: 'published' },
    ),
  );

  const client = createQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  focusManager.setFocused(false);
  const { result } = renderHook(() => useHackathonDraft('evt_draft'), {
    wrapper: Wrapper,
  });
  await waitFor(() =>
    expect(result.current.data?.review.status).toBe('submitted'),
  );

  act(() => focusManager.setFocused(true));
  await waitFor(() =>
    expect(result.current.data?.event.status).toBe('published'),
  );
});
