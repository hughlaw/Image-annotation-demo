import { type ButtonHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

type ButtonVariant = 'success' | 'error' | 'info' | 'default' | 'link' | 'link-success' | 'link-error';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isGrouped?: boolean;
  groupPosition?: 'first' | 'last' | 'default';
  isSelected?: boolean;
}

export default function Button({
  variant = 'default',
  size = 'md',
  isGrouped = false,
  groupPosition = 'default',
  isSelected = false,
  className,
  children,
  ...props
}: ButtonProps) {
  const variantStyles = {
    default: 'bg-gray-100 border border-gray-200 hover:bg-gray-200 text-black',
    success: 'bg-green-500 hover:bg-green-600 text-white',
    error: 'bg-red-500 hover:bg-red-600 text-white',
    info: 'bg-blue-500 hover:bg-blue-600 text-white',
    link: 'text-blue-500 hover:text-blue-600',
    'link-success': 'text-green-500 hover:bg-green-500/10',
    'link-error': 'text-red-500 hover:bg-red-500/10',
  };

  const sizeStyles = {
    link: 'px-0 py-0',
    'link-success': 'px-0 py-0',
    'link-error': 'px-0 py-0',
    xs: 'px-1 py-0.5 text-xs',
    sm: 'px-2 py-1 text-xs',
    md: 'px-2 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const groupStyles = {
    first: 'rounded-r-none',
    last: 'rounded-l-none',
    default: '',
  };

  const isSelectedStyles = {
    true: 'bg-blue-200',
    false: '',
  };

  const baseStyles = 'flex items-center gap-1 rounded-md cursor-pointer transition-colors duration-200';

  const focusStyles = isGrouped ? '' : 'focus:outline-none focus:ring-2 focus:ring-offset-2';

  const classes = twMerge(
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    groupStyles[groupPosition],
    isSelectedStyles[isSelected ? 'true' : 'false'],
    focusStyles,
    className
  );
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
