export default function Loading() {
  return (
    <>
      <header className="hero">
        <h1>My songs</h1>
      </header>
      <ul className="grid" aria-busy="true" aria-label="Loading songs">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <li key={i} className="skeleton" style={{ aspectRatio: "3 / 4" }} />
        ))}
      </ul>
    </>
  );
}
