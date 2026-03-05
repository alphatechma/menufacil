import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface FormCardProps {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function FormCard({ children, footer, className }: FormCardProps) {
  return (
    <div className={cn('bg-white rounded-2xl shadow-sm border border-gray-100', className)}>
      <div className="p-6 space-y-5">{children}</div>
      {footer && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 rounded-b-2xl flex justify-end gap-3">
          {footer}
        </div>
      )}
    </div>
  );
}
