import { useEffect } from 'react';

export function useKeyboardShortcuts(handlers, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event) => {
      const target = event.target;
      const tag = target && target.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (target && target.isContentEditable);
      for (const handler of handlers) {
        if (!handler.match(event)) continue;
        if (typing && !handler.allowInInput) continue;
        event.preventDefault();
        handler.action();
        return;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers, enabled]);
}
