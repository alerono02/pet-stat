import { NavLink, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="page">
      <header className="hero">
        <h1 className="brand">Учёт домашних животных</h1>
        <p className="hero-lead">
          Реестр питомцев, медкарта и суточная норма корма по весу и возрасту.
        </p>
        <nav className="nav" aria-label="Основная навигация">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? "nav-link is-active" : "nav-link"
            }
          >
            Питомцы и медкарта
          </NavLink>
          <NavLink
            to="/feeding"
            className={({ isActive }) =>
              isActive ? "nav-link is-active" : "nav-link"
            }
          >
            Норма кормления
          </NavLink>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
