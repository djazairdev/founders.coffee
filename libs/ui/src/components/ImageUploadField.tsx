import { useRef } from 'react';

import { Button } from './Button.js';
import { LoadingStatus } from './LoadingStatus.js';

export const ImageUploadField = ({
  src,
  alt,
  placeholder,
  labels,
  isBusy,
  onChoose,
  onRemove,
  shape = 'circle',
}: {
  shape?: 'circle' | 'square';
  src: string | null;
  alt: string;
  placeholder: string;
  labels: {
    choose: string;
    replace: string;
    remove: string;
    uploading: string;
  };
  isBusy: boolean;
  onChoose: (file: File) => void;
  onRemove: () => void;
}) => {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="avatar avatar-placeholder">
          <div
            className={`w-20 bg-neutral text-neutral-content ${shape === 'circle' ? 'rounded-full' : 'rounded-box'}`}
          >
            {src ? (
              <img
                src={src}
                alt={alt}
                width={80}
                height={80}
                className={
                  shape === 'circle'
                    ? 'rounded-full object-cover'
                    : 'rounded-box object-contain'
                }
              />
            ) : (
              <span className="text-h3" aria-hidden="true">
                {placeholder}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={() => input.current?.click()}
          >
            {src ? labels.replace : labels.choose}
          </Button>
          {src && (
            <Button
              type="button"
              variant="ghost"
              disabled={isBusy}
              onClick={onRemove}
            >
              {labels.remove}
            </Button>
          )}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={isBusy}
        aria-label={labels.choose}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) onChoose(file);
        }}
      />
      {isBusy && <LoadingStatus label={labels.uploading} className="mt-2" />}
    </div>
  );
};
