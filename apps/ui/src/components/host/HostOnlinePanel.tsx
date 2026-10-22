import {
  host_online_panel,
  host_online_panel_title,
  type Locale,
} from '@founders-coffee/i18n';

export const HostOnlinePanel = ({ locale }: { locale: Locale }) => (
  <div className="flex h-full items-center justify-center bg-base-200 p-8">
    <div className="max-w-sm text-center">
      <p className="text-h4 font-medium">
        {host_online_panel_title({}, { locale })}
      </p>
      <p className="mt-2 text-body text-neutral">
        {host_online_panel({}, { locale })}
      </p>
    </div>
  </div>
);
