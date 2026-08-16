import { useEffect, useRef, useState } from 'react';
import { Icon } from '../icons/Icons.jsx';

export function Dropdown({ trigger, children, align = 'right', closeOnSelect = true }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="dropdown" ref={ref}>
      <div className="dropdown-trigger" onClick={() => setOpen((prev) => !prev)}>
        {trigger}
      </div>
      {open && (
        <div className={`dropdown-menu dropdown-${align}`} onClick={() => closeOnSelect && setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ icon, label, danger = false, onClick, disabled = false }) {
  return (
    <button className={`menu-item${danger ? ' menu-item-danger' : ''}`} onClick={onClick} disabled={disabled} type="button">
      <Icon name={icon} size={15} />
      <span>{label}</span>
    </button>
  );
}
