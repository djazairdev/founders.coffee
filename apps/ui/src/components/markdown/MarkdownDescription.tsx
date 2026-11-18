import { type Locale } from '@founders-coffee/i18n';
import { MarkdownFallback } from './MarkdownFallback';
import { useMarkdownRuntime } from './useMarkdownRuntime';

type MarkdownDescriptionProps = {
  locale: Locale;
  value: string;
  label: string;
  className?: string;
  language?: string | null;
  isRegion?: boolean;
};

export const MarkdownDescription = ({
  locale,
  value,
  label,
  className,
  language,
  isRegion = true,
}: MarkdownDescriptionProps) => {
  const runtime = useMarkdownRuntime();
  const contentLanguage = language === undefined ? locale : language;
  const direction =
    contentLanguage === 'ar' || (!contentLanguage && locale === 'ar')
      ? 'rtl'
      : 'ltr';

  return (
    <div
      aria-busy={runtime.status === 'loading'}
      aria-label={isRegion ? label : undefined}
      className={className}
      dir={direction}
      lang={contentLanguage ?? undefined}
      role={isRegion ? 'region' : undefined}
    >
      {runtime.status === 'ready' ? (
        <runtime.Component
          direction={direction}
          language={contentLanguage}
          value={value}
          label={label}
        />
      ) : (
        <MarkdownFallback value={value} />
      )}
    </div>
  );
};
