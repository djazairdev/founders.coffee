import { type Locale } from '@founders-coffee/i18n';
import { IsolatedLines } from '@founders-coffee/ui';

import { markdownPlainText } from './markdown-plain-text';
import { useMarkdownRuntime } from './useMarkdownRuntime';

type MarkdownDescriptionProps = {
  locale: Locale;
  value: string;
  label: string;
  className?: string;
  language?: string | null;
};

export const MarkdownDescription = ({
  locale,
  value,
  label,
  className,
  language,
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
      aria-label={label}
      className={className}
      dir={direction}
      lang={contentLanguage ?? undefined}
      role="region"
    >
      {runtime.status === 'ready' ? (
        <runtime.Component
          direction={direction}
          language={contentLanguage}
          value={value}
          label={label}
        />
      ) : (
        <p className="whitespace-pre-line leading-relaxed text-neutral">
          <IsolatedLines text={markdownPlainText(value)} />
        </p>
      )}
    </div>
  );
};
