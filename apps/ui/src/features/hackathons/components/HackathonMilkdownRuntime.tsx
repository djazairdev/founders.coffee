import { CrepeBuilder } from '@milkdown/crepe/builder';
import { listItem } from '@milkdown/crepe/feature/list-item';
import { editorViewCtx } from '@milkdown/kit/core';
import { replaceAll } from '@milkdown/kit/utils';
import {
  Milkdown,
  MilkdownProvider,
  useEditor,
  useInstance,
} from '@milkdown/react';
import { useEffect, useRef } from 'react';

import type { Locale } from '@founders-coffee/i18n';

import '@milkdown/crepe/theme/common/prosemirror.css';
import '@milkdown/crepe/theme/common/reset.css';
import '@milkdown/crepe/theme/common/list-item.css';
import '@milkdown/crepe/theme/classic.css';
import './HackathonMilkdownRuntime.css';

export type HackathonMilkdownRuntimeProps = {
  locale: Locale;
  value: string;
  label: string;
};

const HackathonMilkdownSurface = ({
  locale,
  value,
  label,
}: HackathonMilkdownRuntimeProps) => {
  const appliedValue = useRef(value);

  useEditor((root) => {
    const editor = new CrepeBuilder({ root, defaultValue: value });
    editor.addFeature(listItem);
    editor.setReadonly(true);
    return editor;
  }, []);

  const [isLoading, getInstance] = useInstance();

  useEffect(() => {
    if (isLoading || appliedValue.current === value) return;
    const editor = getInstance();
    if (!editor) return;
    editor.action(replaceAll(value));
    appliedValue.current = value;
  }, [getInstance, isLoading, value]);

  useEffect(() => {
    if (isLoading) return;
    const editor = getInstance();
    if (!editor) return;
    editor.action((ctx) => {
      ctx.get(editorViewCtx).dom.setAttribute('aria-label', label);
    });
  }, [getInstance, isLoading, label]);

  return (
    <div
      className="hackathon-milkdown-surface hackathon-milkdown-preview"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      lang={locale}
    >
      <Milkdown />
    </div>
  );
};

export const HackathonMilkdownRuntime = (
  props: HackathonMilkdownRuntimeProps,
) => (
  <MilkdownProvider>
    <HackathonMilkdownSurface {...props} />
  </MilkdownProvider>
);
