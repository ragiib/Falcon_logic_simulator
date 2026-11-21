import { useEffect } from 'react';
import { useUiStore } from '@/store';

export function useThemeEffect() {
  const theme = useUiStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
}
