import { describe, expect, it } from 'vitest';

import { LOCALES } from '@founders-coffee/i18n';
import { organisations } from '@founders-coffee/domain';

import { renderOrganisationDecisionEmail } from './organisation-decision-email.js';

describe('the organisation decision email (B-ORG-06)', () => {
  it.each(LOCALES)(
    'names the organisation in every decision, in %s',
    async (locale) => {
      const subjects = new Set<string>();
      for (const decision of organisations.ORGANISATION_DECISIONS) {
        const email = await renderOrganisationDecisionEmail(locale, {
          organisation: 'Oran Makers',
          decision,
          note: null,
        });
        expect(email.subject).toContain('Oran Makers');
        expect(email.text).toContain('Oran Makers');
        subjects.add(email.subject);
      }
      expect(subjects.size).toBe(organisations.ORGANISATION_DECISIONS.length);
    },
  );

  it('carries the operator’s note only when there is one', async () => {
    const withNote = await renderOrganisationDecisionEmail('fr', {
      organisation: 'Oran Makers',
      decision: 'reject',
      note: 'Ajoutez un lien vers vos événements passés.',
    });
    const withoutNote = await renderOrganisationDecisionEmail('fr', {
      organisation: 'Oran Makers',
      decision: 'approve',
      note: null,
    });

    expect(withNote.text).toContain(
      'Ajoutez un lien vers vos événements passés.',
    );
    expect(withoutNote.text).not.toMatch(/Note|Remarque|Motif/i);
  });

  it('escapes a note written as markup', async () => {
    const email = await renderOrganisationDecisionEmail('en', {
      organisation: 'Oran Makers',
      decision: 'reject',
      note: '<script>alert(1)</script> please add details',
    });

    expect(email.html).not.toContain('<script>alert(1)</script>');
  });
});
