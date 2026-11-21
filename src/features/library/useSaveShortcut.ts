import { useEffect } from 'react';
import { usePersistenceActions } from './usePersistenceActions';

export function useSaveShortcut() {
  const { save } = usePersistenceActions();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        !e.altKey &&
        (e.code === 'KeyS' || e.key.toLowerCase() === 's')
      ) {
        e.preventDefault();
        if (e.repeat) return;
        save();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [save]);
}
