import { useState, useCallback } from 'react';

/**
 * Shared interaction hook for drag-and-drop / tap-to-place tasks.
 * Desktop: HTML5 drag API (handled in components via onDragStart/onDrop).
 * Mobile: tap item to select, tap target to place.
 */
export function useTapOrDrag() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectItem = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const tryPlace = useCallback(
    (targetId: string, validate: (itemId: string, targetId: string) => boolean): boolean => {
      if (!selectedId) return false;
      const valid = validate(selectedId, targetId);
      setSelectedId(null);
      return valid;
    },
    [selectedId],
  );

  const clearSelection = useCallback(() => setSelectedId(null), []);

  return { selectedId, selectItem, tryPlace, clearSelection };
}
