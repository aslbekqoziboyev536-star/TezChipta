import React from 'react';
import { Loader2 } from 'lucide-react';
import { motion, HTMLMotionProps } from 'motion/react';
import { cn } from '../../utils/cn';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children?: React.ReactNode;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, leftIcon, rightIcon, ...props }, ref) => {
    const variants = {
      primary: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20',
      secondary: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-500/20',
      outline: 'border-2 border-emerald-500 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10',
      ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400',
      danger: 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-6 py-3 text-sm',
      lg: 'px-8 py-4 text-base',
      icon: 'p-2',
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
        disabled={loading || disabled}
        className={cn(
          'relative inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-inherit">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
        <span className={cn('flex items-center gap-2', loading ? 'opacity-0' : 'opacity-100')}>
          {leftIcon && !loading && leftIcon}
          {children}
          {rightIcon && !loading && rightIcon}
        </span>
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
