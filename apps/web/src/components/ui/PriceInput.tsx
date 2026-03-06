import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

const PriceInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">R$</span>
        <input
          ref={ref}
          type="number"
          step="0.01"
          min="0"
          className={cn(
            'w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all',
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);

PriceInput.displayName = 'PriceInput';
export { PriceInput };
