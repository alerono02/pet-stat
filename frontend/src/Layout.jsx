import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";

const linkClass = ({ isActive }) => (isActive ? "nav-link is-active" : "nav-link");

export default function Layout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="page">
      <header className="topbar">
        <Link to="/" className="logo" aria-label="Учёт домашних животных — на главную">
          <span className="logo-mark" aria-hidden="true">🐾</span>
          <span className="logo-text">Учёт домашних животных</span>
        </Link>
        <nav className="nav" aria-label="Основная навигация">
          <NavLink to="/" end className={linkClass}>
            Главная
          </NavLink>
          <NavLink to="/pets" className={linkClass}>
            Питомцы
          </NavLink>
          <NavLink to="/feeding" className={linkClass}>
            Норма кормления
          </NavLink>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="footer">
        <span>Учёт домашних животных</span>
        <span className="muted">
          Реестр питомцев, медкарта, дневник веса и расчёт нормы корма
        </span>
      </footer>
    </div>
  );
}
