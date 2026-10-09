export default function Loading() {
  return (
    <>
      <header className="hero creations-hero">
        <span className="eyebrow">YOUR LIBRARY</span>
        <h1>My creations</h1>
      </header>
      <ul className="tiles" aria-busy="true" aria-label="Loading your creations">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <li key={i} className="skeleton" style={{ aspectRatio: "3 / 4" }} />
        ))}
      </ul>
    </>
  );
}
