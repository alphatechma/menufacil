import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all',
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';
export { Input };
