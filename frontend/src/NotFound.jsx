import { Link } from "react-router-dom";
import usePageTitle from "./usePageTitle.js";

export default function NotFound() {
  usePageTitle("Страница не найдена");
  return (
    <section className="panel not-found">
      <p className="not-found-code">404</p>
      <h2>Страница не найдена</h2>
      <p className="muted">Такого адреса на сайте нет. Вернитесь на главную или к списку питомцев.</p>
      <div className="actions">
        <Link to="/" className="btn">На главную</Link>
        <Link to="/pets" className="btn btn-ghost">К питомцам</Link>
      </div>
    </section>
  );
}
