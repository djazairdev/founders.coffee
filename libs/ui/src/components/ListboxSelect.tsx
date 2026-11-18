import { Check } from 'lucide-react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
} from 'react';

import { cn } from '../lib/cn.js';
import { SELECT_CLASS } from './Select.js';

export type ListboxSelectProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'onChange' | 'value'
> & {
  id: string;
  value: string;
  options: readonly { readonly value: string; readonly label: string }[];
  placeholder: string;
  onChange: (value: string) => void;
};

export const ListboxSelect = forwardRef<HTMLButtonElement, ListboxSelectProps>(
  (
    {
      id,
      value,
      options,
      placeholder,
      onChange,
      className,
      dir,
      disabled,
      ...props
    },
    ref,
  ) => {
    const root = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const list = useRef<HTMLUListElement>(null);
    const search = useRef({ text: '', time: 0 });
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const isExpanded = isOpen && !disabled;
    const selectedIndex = options.findIndex((option) => option.value === value);
    const listId = `${id}-options`;

    const bindTrigger = useCallback(
      (element: HTMLButtonElement | null) => {
        trigger.current = element;
        if (typeof ref === 'function') ref(element);
        else if (ref) ref.current = element;
      },
      [ref],
    );

    useEffect(() => {
      if (!isExpanded) return;
      const closeOutside = (event: Event) => {
        if (
          event.target instanceof Node &&
          !root.current?.contains(event.target)
        )
          setIsOpen(false);
      };
      document.addEventListener('pointerdown', closeOutside);
      document.addEventListener('focusin', closeOutside);
      return () => {
        document.removeEventListener('pointerdown', closeOutside);
        document.removeEventListener('focusin', closeOutside);
      };
    }, [isExpanded]);

    useEffect(() => {
      if (isExpanded)
        list.current?.children
          .item(activeIndex)
          ?.scrollIntoView?.({ block: 'nearest' });
    }, [isExpanded, activeIndex]);

    const open = (index = Math.max(selectedIndex, 0)) => {
      setActiveIndex(index);
      setIsOpen(true);
      search.current = { text: '', time: 0 };
    };

    const choose = (index: number) => {
      const option = options[index];
      if (!option || disabled) return;
      onChange(option.value);
      setIsOpen(false);
      trigger.current?.focus();
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Tab' || event.key === 'Escape') {
        if (event.key === 'Escape' && isExpanded) event.preventDefault();
        setIsOpen(false);
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (isExpanded) choose(activeIndex);
        else open();
        return;
      }
      const isDown = event.key === 'ArrowDown';
      const isUp = event.key === 'ArrowUp';
      if (isDown || isUp || event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        if (!options.length) return;
        if (event.key === 'Home') open(0);
        else if (event.key === 'End') open(options.length - 1);
        else if (!isExpanded) open();
        else
          setActiveIndex(
            (index) =>
              (index + (isDown ? 1 : -1) + options.length) % options.length,
          );
        return;
      }
      if (
        event.key.length !== 1 ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      )
        return;
      event.preventDefault();
      const now = Date.now();
      const text =
        `${now - search.current.time < 700 ? search.current.text : ''}${event.key}`.toLocaleLowerCase();
      search.current = { text, time: now };
      const index = options.findIndex((option) =>
        option.label.toLocaleLowerCase().startsWith(text),
      );
      if (index >= 0) {
        setActiveIndex(index);
        setIsOpen(true);
      }
    };

    return (
      <div className="dropdown w-full" dir={dir} ref={root}>
        <button
          {...props}
          aria-activedescendant={
            isExpanded && activeIndex >= 0
              ? `${listId}-${activeIndex}`
              : undefined
          }
          aria-controls={isExpanded ? listId : undefined}
          aria-expanded={isExpanded}
          aria-haspopup="listbox"
          className={cn(SELECT_CLASS, 'tap-target text-start', className)}
          dir={dir}
          disabled={disabled}
          id={id}
          onClick={() => (isExpanded ? setIsOpen(false) : open())}
          onKeyDown={handleKeyDown}
          ref={bindTrigger}
          role="combobox"
          type="button"
        >
          <span className="min-w-0 flex-1 truncate">
            {options[selectedIndex]?.label ?? placeholder}
          </span>
        </button>
        {isExpanded ? (
          <ul
            aria-labelledby={id}
            className="dropdown-content start-0 top-full z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-box border border-base-300 bg-base-100 p-1 text-body-sm shadow-lg"
            dir={dir}
            id={listId}
            ref={list}
            role="listbox"
          >
            {options.map((option, index) => (
              <li
                aria-selected={option.value === value}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-field px-3 py-2 text-start',
                  index === activeIndex ? 'bg-base-200' : 'hover:bg-base-200',
                )}
                dir={dir}
                id={`${listId}-${index}`}
                key={option.value}
                onClick={() => choose(index)}
                onPointerDown={(event) => event.preventDefault()}
                onPointerMove={() => setActiveIndex(index)}
                role="option"
              >
                <span className="flex-1">{option.label}</span>
                {option.value === value ? (
                  <Check aria-hidden="true" className="size-4 shrink-0" />
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  },
);
ListboxSelect.displayName = 'ListboxSelect';
