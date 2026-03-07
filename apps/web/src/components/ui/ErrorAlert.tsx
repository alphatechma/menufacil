import { AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ErrorAlertProps {
  message: string;
  className?: string;
}

export function ErrorAlert({ message, className }: ErrorAlertProps) {
  return (
    <div className={cn('flex items-center gap-3 p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm', className)}>
      <AlertCircle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}
