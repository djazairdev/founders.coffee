import type { ReactNode } from 'react';

export const HackathonManageCollapse = ({
  title,
  description,
  isInitiallyOpen = false,
  children,
}: {
  title: string;
  description?: string;
  isInitiallyOpen?: boolean;
  children: ReactNode;
}) => (
  <details
    open={isInitiallyOpen}
    className="collapse collapse-arrow mt-6 border border-base-300 bg-base-100"
  >
    <summary className="collapse-title flex flex-col items-start justify-center gap-1 after:start-5 after:end-auto pe-4 ps-12">
      <span className="font-display text-h4">{title}</span>
      {description ? (
        <span className="text-body-sm text-neutral">{description}</span>
      ) : null}
    </summary>
    <div className="collapse-content">
      <div className="grid gap-6 [&>*]:!mt-0">{children}</div>
    </div>
  </details>
);
