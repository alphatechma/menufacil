import { useEffect } from 'react';
import { useSnackbar } from 'notistack';

export function useApiErrorHandler() {
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      enqueueSnackbar(detail.message, {
        variant: 'error',
        autoHideDuration: 6000,
        preventDuplicate: true,
      });
    };

    window.addEventListener('api-error', handler);
    return () => window.removeEventListener('api-error', handler);
  }, [enqueueSnackbar]);
}
