import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HackathonDescriptionPreview } from './HackathonDescriptionPreview';

vi.mock('../../../components/markdown/useMarkdownRuntime', () => ({
  useMarkdownRuntime: () => ({
    status: 'ready',
    Component: ({ value }: { value: string }) => <div>{value}</div>,
  }),
}));

describe('hackathon description preview heading', () => {
  afterEach(cleanup);

  it.each(['ar', 'en', 'fr'] as const)(
    'shows only the hackathon title in %s',
    (locale) => {
      render(
        <HackathonDescriptionPreview
          locale={locale}
          title="Builders night"
          description=""
        />,
      );

      expect(
        screen.getByRole('heading', { name: 'Builders night' }),
      ).toBeTruthy();
      expect(screen.queryByText('معاينة مباشرة')).toBeNull();
      expect(screen.queryByText('Live preview')).toBeNull();
      expect(screen.queryByText('Aperçu en direct')).toBeNull();
    },
  );
});
