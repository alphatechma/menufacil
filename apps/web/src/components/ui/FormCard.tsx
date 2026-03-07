import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface FormCardProps {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function FormCard({ children, footer, className }: FormCardProps) {
  return (
    <div className={cn('rounded-2xl border border-border bg-card shadow-sm', className)}>
      <div className="p-6 space-y-5">{children}</div>
      {footer && (
        <div className="px-6 py-4 bg-muted/50 border-t border-border rounded-b-2xl flex justify-end gap-3">
          {footer}
        </div>
      )}
    </div>
  );
}
