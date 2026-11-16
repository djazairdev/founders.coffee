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

import '@milkdown/crepe/theme/common/prosemirror.css';
import '@milkdown/crepe/theme/common/reset.css';
import '@milkdown/crepe/theme/common/list-item.css';
import '@milkdown/crepe/theme/classic.css';
import './MarkdownRuntime.css';

export type MarkdownRuntimeProps = {
  direction: 'ltr' | 'rtl';
  language: string | null;
  value: string;
  label: string;
};

const MarkdownSurface = ({
  direction,
  language,
  value,
  label,
}: MarkdownRuntimeProps) => {
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
      className="markdown-surface markdown-preview"
      dir={direction}
      lang={language ?? undefined}
    >
      <Milkdown />
    </div>
  );
};

export const MarkdownRuntime = (props: MarkdownRuntimeProps) => (
  <MilkdownProvider>
    <MarkdownSurface {...props} />
  </MilkdownProvider>
);
