export function Section({ title, description, actions, children }) {
  return (
    <section className="editor-section card">
      <div className="editor-section-head">
        <div>
          <h3 className="editor-section-title">{title}</h3>
          {description && <p className="editor-section-desc">{description}</p>}
        </div>
        {actions}
      </div>
      <div className="editor-section-body">{children}</div>
    </section>
  );
}
