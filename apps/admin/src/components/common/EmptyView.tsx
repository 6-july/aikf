interface EmptyViewProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function EmptyView({ eyebrow, title, description }: EmptyViewProps) {
  return (
    <>
      <header className="topbar">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
        </div>
      </header>
      <section className="list-workspace">
        <div className="qa-list-panel placeholder-panel">
          <div className="empty-state">
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        </div>
      </section>
    </>
  );
}
