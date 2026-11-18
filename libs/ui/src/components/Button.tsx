import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '../lib/cn.js';

export const buttonVariants = cva('btn btn-xs sm:btn-sm md:btn-md', {
  variants: {
    variant: {
      primary: 'btn-primary',
      cta: 'btn-secondary',
      secondary: 'btn-secondary',
      accent: 'btn-accent',
      outline: 'btn-outline',
      ghost: 'btn-ghost',
      link: 'btn-link',
    },
    isFullWidth: {
      true: 'w-full',
      false: '',
    },
  },
  defaultVariants: { variant: 'primary', isFullWidth: false },
});

export interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isBusy?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      isFullWidth,
      isBusy,
      type = 'button',
      onClick,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        buttonVariants({ variant, isFullWidth }),
        isBusy && 'btn-disabled',
        className,
      )}
      onClick={isBusy ? (event) => event.preventDefault() : onClick}
      {...(isBusy ? { 'aria-disabled': true } : {})}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
