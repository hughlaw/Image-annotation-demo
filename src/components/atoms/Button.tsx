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
    default:
      'bg-gray-100 border border-gray-200 hover:bg-gray-200 text-black disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
    success: 'bg-green-500 hover:bg-green-600 text-white disabled:bg-green-300 disabled:cursor-not-allowed',
    error: 'bg-red-500 hover:bg-red-600 text-white disabled:bg-red-300 disabled:cursor-not-allowed',
    info: 'bg-blue-500 hover:bg-blue-600 text-white disabled:bg-blue-300 disabled:cursor-not-allowed',
    link: 'text-blue-500 hover:text-blue-600 disabled:text-blue-300 disabled:cursor-not-allowed',
    'link-success': 'text-green-500 hover:bg-green-500/10 disabled:text-green-300 disabled:cursor-not-allowed',
    'link-error': 'text-red-500 hover:bg-red-500/10 disabled:text-red-300 disabled:cursor-not-allowed',
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
