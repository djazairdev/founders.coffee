import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { HostFace } from './HostFace';

afterEach(cleanup);

describe('HostFace', () => {
  it('leaves the initial out of a link it sits in (#473)', () => {
    render(
      <a href="/profile">
        <HostFace name="Member One" photoAssetId={null} />
        <bdi>Member One</bdi>
      </a>,
    );

    expect(screen.getByRole('link', { name: 'Member One' })).toBeTruthy();
  });

  it('still shows the initial', () => {
    const { container } = render(
      <HostFace name="Member One" photoAssetId={null} />,
    );

    expect(container.textContent).toBe('M');
  });
});
