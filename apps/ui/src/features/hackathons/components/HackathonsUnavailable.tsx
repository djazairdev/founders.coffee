import { hackathons_unavailable, type Locale } from '@founders-coffee/i18n';
import { StatusMessage } from '@founders-coffee/ui';

export const HackathonsUnavailable = ({ locale }: { locale: Locale }) => (
  <StatusMessage variant="info">
    {hackathons_unavailable({}, { locale })}
  </StatusMessage>
);
