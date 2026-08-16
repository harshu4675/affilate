import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createId } from '../../utils/id.js';
import { Icon } from '../icons/Icons.jsx';
import { IconButton } from './Button.jsx';

const ToastContext = createContext(null);

const TYPE_ICONS = {
  success: 'checkCircle',
  error: 'xCircle',
  warning: 'alertTriangle',
  info: 'info'
};

function Toast({ toast, onClose }) {
  return (
    <div className={`toast toast-${toast.type}`}>
      <span className="toast-icon">
        <Icon name={TYPE_ICONS[toast.type] || 'info'} size={17} />
      </span>
      <span className="toast-message">{toast.message}</span>
      <IconButton name="close" label="Dismiss" size="sm" onClick={onClose} />
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (type, message, options = {}) => {
      const id = createId('toast');
      setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
      window.setTimeout(() => dismiss(id), options.duration || (type === 'error' ? 6500 : 4200));
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      success: (message, options) => push('success', message, options),
      error: (message, options) => push('error', message, options),
      warning: (message, options) => push('warning', message, options),
      info: (message, options) => push('info', message, options)
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
