export default function Placeholder({ title, note }) {
  return (
    <section>
      <h1>{title}</h1>
      <p className="muted">{note}</p>
    </section>
  );
}
