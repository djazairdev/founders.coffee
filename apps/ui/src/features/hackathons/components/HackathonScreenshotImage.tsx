import { hackathon_screenshot_alt, type Locale } from '@founders-coffee/i18n';

export const HackathonScreenshotImage = ({
  screenshot,
  position,
  title,
  locale,
}: {
  screenshot: {
    readonly id: string;
    readonly width: number;
    readonly height: number;
  };
  position: number;
  title: string;
  locale: Locale;
}) => {
  const src = `/media/submission/${screenshot.id}`;
  return (
    <a href={src} target="_blank" rel="noopener noreferrer" className="block">
      <img
        src={src}
        width={screenshot.width}
        height={screenshot.height}
        loading="lazy"
        alt={hackathon_screenshot_alt({ position, title }, { locale })}
        className="h-auto w-full rounded-box border border-base-300"
      />
    </a>
  );
};
