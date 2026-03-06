import { useCallback, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { useUploadImageMutation } from '@/api/adminApi';
import { cn } from '@/utils/cn';

interface ImageUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  className?: string;
}

export function ImageUpload({ value, onChange, className }: ImageUploadProps) {
  const [uploadImage, { isLoading }] = useUploadImageMutation();
  const [dragActive, setDragActive] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const result = await uploadImage(formData).unwrap();
        onChange(result.url);
      } catch {
        // Error handled by RTK Query
      }
    },
    [uploadImage, onChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  if (value) {
    return (
      <div className={cn('relative w-full h-48 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600', className)}>
        <img src={value} alt="Upload" className="w-full h-full object-cover" />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full shadow hover:bg-white"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    );
  }

  return (
    <label
      className={cn(
        'flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
        dragActive ? 'border-primary bg-primary-50' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500',
        isLoading && 'opacity-50 pointer-events-none',
        className,
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
      {isLoading ? (
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          <Upload className="w-8 h-8 text-gray-400 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Clique ou arraste uma imagem</p>
        </>
      )}
      <input type="file" accept="image/*" className="hidden" onChange={handleInputChange} />
    </label>
  );
}
