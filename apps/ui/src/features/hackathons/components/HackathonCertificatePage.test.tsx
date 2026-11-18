import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { CertificatePage } from '../api';
import { HackathonCertificatePage } from './HackathonCertificatePage';

const VALID: CertificatePage = {
  status: 'valid',
  memberName: 'Rania Benali',
  kind: 'winner',
  placement: 'First prize',
  hackathonTitle: 'Algiers Builders Weekend',
  startsAt: Date.parse('2099-03-01T10:00:00Z'),
  endsAt: Date.parse('2099-03-03T10:00:00Z'),
  timeZone: 'Africa/Algiers',
  organisers: ['GDG Algiers', 'Code Club'],
};

afterEach(cleanup);

describe('HackathonCertificatePage', () => {
  it('shows the member, the hackathon, the placement, the organisers and that it is verified', () => {
    render(<HackathonCertificatePage certificate={VALID} locale="en" />);

    expect(
      screen.getByRole('heading', { name: 'Winner’s certificate', level: 1 }),
    ).toBeTruthy();
    expect(screen.getByText('Rania Benali')).toBeTruthy();
    expect(screen.getByText('won a prize at')).toBeTruthy();
    expect(screen.getByText('Algiers Builders Weekend')).toBeTruthy();
    expect(screen.getByText('First prize')).toBeTruthy();
    expect(screen.getByText('GDG Algiers')).toBeTruthy();
    expect(screen.getByText('Verified by founders.coffee')).toBeTruthy();
    expect(screen.getByText(/ to /u).textContent).toContain('2099');
  });

  it('shows one day when the hackathon has no end', () => {
    render(
      <HackathonCertificatePage
        certificate={{
          ...VALID,
          kind: 'participant',
          placement: null,
          endsAt: null,
        }}
        locale="en"
      />,
    );

    expect(screen.getByText('took part in')).toBeTruthy();
    expect(screen.queryByText(/ to /u)).toBeNull();
  });

  it('says a revoked or unknown code so, in Arabic too', () => {
    const { rerender } = render(
      <HackathonCertificatePage
        certificate={{ status: 'revoked' }}
        locale="en"
      />,
    );
    expect(screen.getByText('This certificate was revoked.')).toBeTruthy();
    expect(screen.queryByText('Verified by founders.coffee')).toBeNull();

    rerender(
      <HackathonCertificatePage
        certificate={{ status: 'unknown' }}
        locale="ar"
      />,
    );
    expect(
      screen.getByText('لم نعثر على هذه الشهادة. تحقق من الرابط.'),
    ).toBeTruthy();
  });
});
