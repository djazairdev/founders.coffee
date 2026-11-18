import { describe, expect, it } from 'vitest';

import { LOCALES } from '@founders-coffee/i18n';

import { SKILL_OPTIONS, skillLabel } from './skill-labels';

describe('skill labels', () => {
  it.each(LOCALES)('names every skill in %s, each once', (locale) => {
    const labels = SKILL_OPTIONS.map((skill) => skillLabel(skill, locale));
    expect(labels.every((label) => label.trim().length > 0)).toBe(true);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('names a skill in the reader’s language', () => {
    expect(skillLabel('ai_ml', 'en')).toBe('AI and machine learning');
    expect(skillLabel('ai_ml', 'fr')).toBe('IA et apprentissage automatique');
    expect(skillLabel('ai_ml', 'ar')).toBe('الذكاء الاصطناعي وتعلّم الآلة');
  });
});
