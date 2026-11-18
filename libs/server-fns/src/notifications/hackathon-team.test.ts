import { describe, expect, it } from 'vitest';

import { hackathonTeamMessage } from './hackathon-team.js';

describe('hackathon team notices (B-TEAM-09, B-SUB-07, B-SAFE-02)', () => {
  it('escapes what members typed in the email’s HTML only', async () => {
    const message = await hackathonTeamMessage(
      'hackathon_team_joined',
      {
        title: 'Build <Algiers>',
        team: '<b>Byte</b>',
        name: 'Amina & co',
        project: '',
        reason: '',
        url: 'https://founders.coffee/en/hackathon/evt_1/team',
      },
      'en',
    );

    expect(message.pushTitle).toBe('Amina & co joined <b>Byte</b>');
    expect(message.html).toContain('&lt;b&gt;Byte&lt;/b&gt;');
    expect(message.html).toContain('Amina &amp; co');
    expect(message.html).not.toContain('<b>Byte</b>');
    expect(message.text).toContain('Amina & co joined <b>Byte</b>');
  });

  it('names the project and who submitted it in a receipt, in the reader’s language', async () => {
    const values = {
      title: 'Build Algiers',
      team: 'Byte Club',
      name: 'Amina',
      project: 'Ledger <beta>',
      reason: '',
      url: 'https://founders.coffee/ar/hackathon/evt_1/submit',
    };
    const english = await hackathonTeamMessage(
      'hackathon_submission_received',
      values,
      'en',
    );
    expect(english.pushBody).toContain('Amina submitted Ledger <beta> to');
    expect(english.html).toContain('<strong>Ledger &lt;beta&gt;</strong>');
    expect(english.subject).toBe('Submitted: Ledger <beta> for Build Algiers');

    const arabic = await hackathonTeamMessage(
      'hackathon_submission_received',
      values,
      'ar',
    );
    expect(arabic.pushTitle).toBe('سُلّم مشروع Byte Club');
  });

  it('tells a disqualified team the reason the administrator gave, escaped in the HTML', async () => {
    const message = await hackathonTeamMessage(
      'hackathon_team_disqualified',
      {
        title: 'Build Algiers',
        team: 'Byte Club',
        name: '',
        project: '',
        reason: 'Copied from <another> team',
        url: 'https://founders.coffee/fr/hackathon/evt_1/team',
      },
      'fr',
    );

    expect(message.pushBody).toBe('Motif : Copied from <another> team');
    expect(message.html).toContain('Motif : Copied from &lt;another&gt; team');
    expect(message.html).not.toContain('<another>');
    expect(message.subject).toBe(
      'Votre équipe a été disqualifiée : hackathon « Build Algiers »',
    );
  });
});
