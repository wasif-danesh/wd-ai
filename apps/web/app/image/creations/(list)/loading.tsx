export default function Loading() {
  return (
    <>
      <header className="hero">
        <h1>My images</h1>
      </header>
      <ul className="grid" aria-busy="true" aria-label="Loading images">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <li key={i} className="skeleton" style={{ aspectRatio: "3 / 4" }} />
        ))}
      </ul>
    </>
  );
}
