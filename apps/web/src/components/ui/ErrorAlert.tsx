import { cn } from '@/utils/cn';

interface ErrorAlertProps {
  message: string;
  className?: string;
}

export function ErrorAlert({ message, className }: ErrorAlertProps) {
  return (
    <div className={cn('p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm', className)}>
      {message}
    </div>
  );
}
