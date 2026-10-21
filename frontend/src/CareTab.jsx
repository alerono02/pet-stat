import { useEffect, useState } from "react";
import { api, formatDate, isAbort } from "./api.js";
import { pluralize } from "./api.js";

const STATUS = {
  past: { label: "по графику", className: "tag" },
  soon: { label: "скоро", className: "tag tag-soon" },
  later: { label: "впереди", className: "tag tag-later" },
};

function useLoad(loader, deps) {
  const [state, setState] = useState({ data: null, error: "", loading: true });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setState({ data: null, error: "", loading: true });
    loader(ctrl.signal)
      .then((data) => setState({ data, error: "", loading: false }))
      .catch((err) => {
        if (!isAbort(err)) setState({ data: null, error: err.message, loading: false });
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reload]);

  return [state, () => setReload((n) => n + 1)];
}

export default function CareTab({ pet }) {
  const [age, reloadAge] = useLoad((s) => api.humanAge(pet.id, s), [pet.id, pet.weight_kg]);
  const [vac, reloadVac] = useLoad((s) => api.vaccinations(pet.id, s), [pet.id]);

  return (
    <>
      <section className="panel" aria-labelledby="age-title">
        <div className="panel-head">
          <h2 id="age-title">Возраст в человеческих годах</h2>
        </div>
        {age.loading && <p className="empty">Расчёт…</p>}
        {age.error && (
          <p className="msg error">
            {age.error}{" "}
            <button type="button" className="linkish" onClick={reloadAge}>
              Повторить
            </button>
          </p>
        )}
        {age.data && (
          <div className="norm-grid care-age">
            <div className="norm-stat">
              <span className="value kcal">≈ {age.data.human_years}</span>
              <span className="label">
                {pluralize(Math.round(age.data.human_years), ["год", "года", "лет"])} по человеческой шкале
              </span>
            </div>
            <div className="norm-stat">
              <span className="value" style={{ fontSize: "1.25rem" }}>{age.data.life_stage}</span>
              <span className="label">стадия жизни</span>
            </div>
          </div>
        )}
      </section>

      <section className="panel panel-feed" aria-labelledby="vac-title">
        <div className="panel-head">
          <h2 id="vac-title">Календарь вакцинации</h2>
        </div>
        {vac.loading && <p className="empty">Расчёт…</p>}
        {vac.error && (
          <p className="msg error">
            {vac.error}{" "}
            <button type="button" className="linkish" onClick={reloadVac}>
              Повторить
            </button>
          </p>
        )}
        {vac.data && (
          <>
            {vac.data.next_due && (
              <p className="next-due">
                Ближайшая: <strong>{vac.data.next_due.name}</strong> —{" "}
                {formatDate(vac.data.next_due.due_date)}
              </p>
            )}
            <ol className="timeline">
              {vac.data.items.map((i) => (
                <li key={`${i.name}-${i.due_date}`} className="timeline-item">
                  <div className="timeline-date">{formatDate(i.due_date)}</div>
                  <div className="timeline-body">
                    <p className="timeline-title">{i.name}</p>
                    <p>
                      <span className={(STATUS[i.status] || STATUS.later).className}>
                        {(STATUS[i.status] || STATUS.later).label}
                      </span>{" "}
                      <span className="muted">возраст: {i.age}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="muted feed-hint">
              Календарь ориентировочный. Схему вакцинации подтверждает ветеринар.
            </p>
          </>
        )}
      </section>
    </>
  );
}
