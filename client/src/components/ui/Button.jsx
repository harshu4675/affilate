import { Spinner } from './Spinner.jsx';
import { Icon } from '../icons/Icons.jsx';

export function Button({ variant = 'primary', size = 'md', icon, loading = false, children, className = '', ...rest }) {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${className}`}
      disabled={rest.disabled || loading}
      {...rest}
    >
      {loading ? <Spinner size={size === 'sm' ? 14 : 16} /> : icon ? <Icon name={icon} size={size === 'sm' ? 14 : 16} /> : null}
      {children}
    </button>
  );
}

export function IconButton({ name, label, size = 'md', className = '', ...rest }) {
  return (
    <button className={`icon-btn icon-btn-${size} ${className}`} type="button" aria-label={label} title={label} {...rest}>
      <Icon name={name} size={size === 'sm' ? 15 : 17} />
    </button>
  );
}
