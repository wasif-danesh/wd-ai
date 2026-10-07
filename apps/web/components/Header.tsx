import { Logo } from "./Logo";
import { NavLink } from "./NavLink";

export function Header() {
  return (
    <header className="header">
      <div className="header__inner">
        <Logo />
        <nav className="nav" aria-label="Main">
          <NavLink href="/">Create</NavLink>
          <NavLink href="/songs">My songs</NavLink>
        </nav>
      </div>
    </header>
  );
}
