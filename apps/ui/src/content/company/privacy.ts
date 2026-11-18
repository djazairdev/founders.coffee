import { privacyDataSections } from './privacy-data';
import { privacyHackathonsSection } from './privacy-hackathons';
import { privacyProcessingSections } from './privacy-processing';
import { privacyRightsSections } from './privacy-rights';
import type { CompanyPageContent } from './types';

export const privacyContent: CompanyPageContent = {
  title: 'سياسة الخصوصية',
  description:
    'ما تجمعه المنصة من معطيات شخصية، ولأيّ غرض، ومن يطّلع عليها، وكم تبقى، وما تملكه أنت حيالها.',
  updated: '5 نوفمبر 2026',
  sections: [
    ...privacyDataSections,
    privacyHackathonsSection,
    ...privacyProcessingSections,
    ...privacyRightsSections,
  ],
};
