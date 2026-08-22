import { useEffect, useRef } from 'react';

export function useAutosave(value, delay, onSave) {
  const first = useRef(true);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = setTimeout(() => onSaveRef.current(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
}
