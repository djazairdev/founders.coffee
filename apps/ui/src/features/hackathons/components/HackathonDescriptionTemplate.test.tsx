import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { hackathon_desc_template } from '@founders-coffee/i18n';

import {
  renderHackathonWizard,
  resetHackathonWizard,
} from './HackathonCreatePage.fixtures';

describe('hackathon description template', () => {
  afterEach(resetHackathonWizard);

  it.each([
    {
      locale: 'ar' as const,
      title: 'عنوان الهاكاثون',
      field: 'الذكاء الاصطناعي',
      type: 'مفتوح المواضيع',
      next: 'التالي',
      description: 'وصف الهاكاثون',
    },
    {
      locale: 'en' as const,
      title: 'Hackathon title',
      field: 'Artificial intelligence',
      type: 'Open topic',
      next: 'Next',
      description: 'Hackathon description',
    },
    {
      locale: 'fr' as const,
      title: 'Titre du hackathon',
      field: 'Intelligence artificielle',
      type: 'Thème libre',
      next: 'Suivant',
      description: 'Description du hackathon',
    },
  ])(
    'starts with an editable localized template ($locale)',
    ({ locale, title, field, type, next, description }) => {
      renderHackathonWizard(locale);
      fireEvent.change(screen.getByLabelText(title), {
        target: { value: 'Hackathon title' },
      });
      fireEvent.click(screen.getByRole('button', { name: field }));
      fireEvent.click(screen.getByRole('button', { name: type }));
      fireEvent.click(screen.getByRole('button', { name: next }));
      fireEvent.click(screen.getByRole('button', { name: 'Set schedule' }));
      fireEvent.click(screen.getByRole('button', { name: next }));

      const input = screen.getByLabelText(description) as HTMLTextAreaElement;
      expect(input.value).toBe(hackathon_desc_template({}, { locale }));
      fireEvent.change(input, { target: { value: '# Edited by organiser' } });
      expect(input.value).toBe('# Edited by organiser');
    },
  );
});
