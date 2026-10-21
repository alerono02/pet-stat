import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatDate, formatWeight, isAbort, pluralize } from "./api.js";
import usePageTitle from "./usePageTitle.js";

function Stat({ value, label, tone }) {
  return (
    <div className={`stat-card ${tone || ""}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

export default function Dashboard() {
  usePageTitle("");
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError("");
    api
      .stats(ctrl.signal)
      .then(setStats)
      .catch((err) => {
        if (!isAbort(err)) setError(err.message);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [reload]);

  const dogs = stats?.by_species.dog ?? 0;
  const cats = stats?.by_species.cat ?? 0;
  const total = stats?.total_pets ?? 0;

  return (
    <>
      <section className="hero">
        <h1 className="brand">Всё о ваших питомцах в одном месте</h1>
        <p className="hero-lead">
          Карточки животных, медкарта, дневник веса и суточная норма корма по весу и возрасту.
        </p>
        <div className="hero-actions">
          <Link to="/pets" className="btn btn-light">Список питомцев</Link>
          <Link to="/feeding" className="btn btn-outline-light">Рассчитать норму кормления</Link>
        </div>
      </section>

      {error && (
        <div className="msg error load-error">
          {error}{" "}
          <button type="button" className="linkish" onClick={() => setReload((n) => n + 1)}>
            Повторить
          </button>
        </div>
      )}

      {loading && !stats && <p className="empty">Загрузка статистики…</p>}

      {stats && (
        <>
          <div className="stat-grid">
            <Stat value={total} label={pluralize(total, ["питомец", "питомца", "питомцев"])} />
            <Stat value={dogs} label={pluralize(dogs, ["собака", "собаки", "собак"])} />
            <Stat value={cats} label={pluralize(cats, ["кошка", "кошки", "кошек"])} />
            <Stat
              value={stats.avg_weight_kg === null ? "—" : formatWeight(stats.avg_weight_kg)}
              label="средний вес"
              tone="grain"
            />
            <Stat
              value={stats.records_total}
              label={pluralize(stats.records_total, ["запись в медкартах", "записи в медкартах", "записей в медкартах"])}
            />
          </div>

          <div className="dash-grid">
            <section className="panel" aria-labelledby="species-title">
              <h2 id="species-title">Состав по видам</h2>
              {total === 0 ? (
                <p className="empty">Пока нет ни одного питомца.</p>
              ) : (
                <>
                  <div
                    className="split-bar"
                    role="img"
                    aria-label={`Собак: ${dogs}, кошек: ${cats}`}
                  >
                    <span className="split dog" style={{ flexGrow: dogs }} />
                    <span className="split cat" style={{ flexGrow: cats }} />
                  </div>
                  <ul className="legend">
                    <li><span className="dot dog" /> Собаки: <strong>{dogs}</strong></li>
                    <li><span className="dot cat" /> Кошки: <strong>{cats}</strong></li>
                  </ul>
                </>
              )}
            </section>

            <section className="panel" aria-labelledby="recent-title">
              <h2 id="recent-title">Последние приёмы</h2>
              {stats.recent_records.length === 0 ? (
                <p className="empty">Записей в медкартах пока нет.</p>
              ) : (
                <ul className="recent-list">
                  {stats.recent_records.map((r) => (
                    <li key={r.id}>
                      <Link to={`/pets/${r.pet_id}?tab=records`}>
                        <strong>{r.pet_name}</strong>
                        <span className="muted">
                          {formatDate(r.visit_date)} ·{" "}
                          {r.diagnosis || (r.vaccination ? `вакцинация: ${r.vaccination}` : "приём")}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
