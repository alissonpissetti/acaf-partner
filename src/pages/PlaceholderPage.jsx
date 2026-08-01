export function PlaceholderPage({ title, description }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <p className="muted">{description}</p>
      <div className="placeholder-box">Módulo em construção</div>
    </section>
  );
}
