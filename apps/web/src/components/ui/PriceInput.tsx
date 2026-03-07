import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

const PriceInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
        <input
          ref={ref}
          type="number"
          step="0.01"
          min="0"
          className={cn(
            'flex h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 py-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
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
