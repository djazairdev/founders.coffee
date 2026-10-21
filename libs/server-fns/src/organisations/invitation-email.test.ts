import { describe, expect, it } from 'vitest';

import { renderInvitationEmail } from './invitation-email.js';

const values = {
  organisation: 'Code Club Alger',
  inviter: 'Amina',
  role: 'member',
  url: 'https://founders.coffee/en/o/invitations/inv_1',
};

describe('the organisation invitation email (B-ORG-05)', () => {
  it.each([
    [
      'ar',
      'rtl',
      'انضم إلى Code Club Alger على Founders Coffee',
      'وصلتك دعوة من Amina للانضمام إلى Code Club Alger',
    ],
    [
      'fr',
      'ltr',
      'Rejoignez Code Club Alger sur Founders Coffee',
      'Amina vous invite à rejoindre Code Club Alger',
    ],
    [
      'en',
      'ltr',
      'Join Code Club Alger on Founders Coffee',
      'Amina invited you to join Code Club Alger',
    ],
  ] as const)(
    'reads in %s, %s, naming who invited and to what',
    async (locale, direction, subject, line) => {
      const email = await renderInvitationEmail(locale, values);

      expect(email.subject).toBe(subject);
      expect(email.html).toContain(`dir="${direction}"`);
      expect(email.text).toContain(line);
      expect(email.html).toContain(values.url);
      expect(email.text).toContain('7');
    },
  );

  it('names the admin role only for an admin', async () => {
    const admin = await renderInvitationEmail('en', {
      ...values,
      role: 'admin',
    });
    const member = await renderInvitationEmail('en', values);

    expect(admin.text).toContain('help run Code Club Alger');
    expect(member.text).not.toContain('admin');
  });

  it('escapes what members wrote rather than rendering it', async () => {
    const email = await renderInvitationEmail('en', {
      ...values,
      organisation: '<b>Club</b>',
    });

    expect(email.html).not.toContain('<b>Club</b>');
  });
});
