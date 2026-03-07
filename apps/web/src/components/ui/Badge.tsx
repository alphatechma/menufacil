import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-muted text-foreground',
        success: 'border-transparent bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
        warning: 'border-transparent bg-amber-500/15 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
        danger: 'border-transparent bg-red-500/15 text-red-700 dark:bg-red-500/10 dark:text-red-400',
        info: 'border-transparent bg-blue-500/15 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
