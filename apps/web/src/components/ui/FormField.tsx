import { type ReactElement } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { cn } from '@/utils/cn';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface FormFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  required?: boolean;
  className?: string;
  children: (field: {
    value: any;
    onChange: (...event: any[]) => void;
    onBlur: () => void;
    ref: React.Ref<any>;
    name: string;
  }) => ReactElement;
}

export function FormField<T extends FieldValues>({ control, name, label, required, className, children }: FormFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className={cn('space-y-1.5', className)}>
          {label && (
            <label className="block text-sm font-medium text-gray-700">
              {label}
              {required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
          )}
          {children(field)}
          {fieldState.error && (
            <p className="text-xs text-red-500">{fieldState.error.message}</p>
          )}
        </div>
      )}
    />
  );
}
