import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import type { JudgeEntryPageView, JudgePageView } from '../api';
import { entryView, SUBMISSION_ID } from '../judge-entry-page.fixtures';
import { EVENT_ID, markets } from '../team-page.fixtures';
import { HackathonJudgeEntryPage } from './HackathonJudgeEntryPage';

const api = vi.hoisted(() => ({
  entry:
    vi.fn<(input: { submissionId: string }) => Promise<JudgeEntryPageView>>(),
  page: vi.fn<() => Promise<JudgePageView>>(),
  saveScores: vi.fn(),
  recuse: vi.fn(),
}));

vi.mock('../api', () => ({ judgingApi: api }));

const NEXT_ID = 'sub_souk';
const ledger = entryView();
const souk = entryView({
  entry: ledger.entry && {
    ...ledger.entry,
    submissionId: NEXT_ID,
    title: 'Souk',
  },
});

const cache = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
});

afterEach(() => {
  cleanup();
  cache.clear();
  vi.restoreAllMocks();
});

const renderEntry = async () => {
  const root = createRootRoute();
  const entry = createRoute({
    getParentRoute: () => root,
    path: '$locale/hackathon/$eventId/judge/$submissionId',
    component: () => {
      const { eventId, submissionId } = entry.useParams();
      return (
        <HackathonJudgeEntryPage
          eventId={eventId}
          submissionId={submissionId}
          locale="en"
          markets={markets}
        />
      );
    },
  });
  const router = createRouter({
    routeTree: root.addChildren([entry]),
    history: createMemoryHistory({
      initialEntries: [`/en/hackathon/${EVENT_ID}/judge/${NEXT_ID}`],
    }),
  });
  await router.load();
  render(
    <QueryClientProvider client={cache}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

const criterion = (name: string) => within(screen.getByRole('group', { name }));

it('keeps scores, comments and recusal reasons on their own entry when moving to a cached submission (B-JDG-07)', async () => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  api.entry.mockImplementation(async ({ submissionId }) =>
    submissionId === NEXT_ID ? souk : ledger,
  );
  api.page.mockResolvedValue({
    event: ledger.event,
    submissionDeadlineAt: ledger.submissionDeadlineAt,
    judgingEndsAt: ledger.judgingEndsAt,
    stage: 'judging',
    isJudge: true,
    entries: [
      {
        submissionId: SUBMISSION_ID,
        teamName: 'Byte Club',
        title: 'Ledger',
        trackTitle: 'Payments',
        state: 'to_score',
      },
      {
        submissionId: NEXT_ID,
        teamName: 'Souk Squad',
        title: 'Souk',
        trackTitle: null,
        state: 'to_score',
      },
    ],
    progress: { scored: 0, toScore: 2, recused: 0 },
    recordOffer: null,
    certificates: [],
  });

  await renderEntry();
  fireEvent.click(await screen.findByRole('link', { name: 'Ledger' }));
  await screen.findByRole('heading', { name: 'Ledger' });
  fireEvent.click(criterion('Impact').getByRole('radio', { name: '8' }));
  fireEvent.click(criterion('Craft').getByRole('radio', { name: '3' }));
  fireEvent.change(criterion('Craft').getByRole('textbox'), {
    target: { value: 'Comment for Ledger.' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Reason' }), {
    target: { value: 'I advised Ledger.' },
  });

  fireEvent.click(await screen.findByRole('link', { name: 'Souk' }));
  await screen.findByRole('heading', { name: 'Souk' });

  expect(api.entry).toHaveBeenCalledTimes(2);
  expect(
    criterion('Impact').queryByRole('radio', { checked: true }),
  ).toBeNull();
  expect(criterion('Craft').getByRole('textbox')).toHaveProperty('value', '');
  expect(screen.getByRole('textbox', { name: 'Reason' })).toHaveProperty(
    'value',
    '',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Save scores' }));
  expect(api.saveScores).not.toHaveBeenCalled();
});
