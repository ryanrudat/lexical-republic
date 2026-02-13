import { useEffect } from 'react';
import { useViewStore } from '../stores/viewStore';

export function useViewTheme() {
  const currentView = useViewStore((s) => s.currentView);

  useEffect(() => {
    document.body.classList.remove('view-office', 'view-terminal');
    document.body.classList.add(`view-${currentView}`);
    return () => {
      document.body.classList.remove('view-office', 'view-terminal');
    };
  }, [currentView]);
}
