export function Field({ label, hint, error, children, htmlFor, className = '' }) {
  return (
    <div className={`field${error ? ' field-error' : ''} ${className}`}>
      {label && (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {hint && !error && <p className="field-hint">{hint}</p>}
      {error && <p className="field-error-text">{error}</p>}
    </div>
  );
}

export function Input({ className = '', ...rest }) {
  return <input className={`input ${className}`} {...rest} />;
}

export function Textarea({ className = '', ...rest }) {
  return <textarea className={`input textarea ${className}`} {...rest} />;
}

export function Select({ className = '', children, ...rest }) {
  return (
    <select className={`input select ${className}`} {...rest}>
      {children}
    </select>
  );
}
