import { Fragment, useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Modal from "./Modal.jsx";
import PetForm from "./PetForm.jsx";
import Pagination from "./Pagination.jsx";
import { useToast } from "./Toast.jsx";
import usePageTitle from "./usePageTitle.js";
import {
  SPECIES_LABEL,
  ageLabel,
  api,
  fetchPets,
  formatDate,
  formatWeight,
  isAbort,
  pluralize,
} from "./api.js";

const PAGE_SIZE = 10;

const SPECIES_FILTERS = [
  { value: "", label: "Все" },
  { value: "dog", label: "Собаки" },
  { value: "cat", label: "Кошки" },
];

const COLUMNS = [
  { sort: "name", label: "Кличка" },
  { label: "Вид" },
  { label: "Порода", hideSm: true },
  { sort: "age", label: "Возраст" },
  { sort: "weight", label: "Вес" },
  { label: "Владелец", hideSm: true },
];

export default function PetsPage() {
  usePageTitle("Питомцы");
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const q = params.get("q") || "";
  const species = params.get("species") || "";
  const sort = params.get("sort") || "id";
  const order = params.get("order") || "asc";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const [search, setSearch] = useState(q);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [expanded, setExpanded] = useState(null);
  const [records, setRecords] = useState({});

  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const update = useCallback(
    (patch) => {
      const next = new URLSearchParams(params);
      Object.entries(patch).forEach(([key, value]) => {
        if (value === "" || value === null || value === undefined) next.delete(key);
        else next.set(key, String(value));
      });
      if (next.get("page") === "1") next.delete("page");
      if (next.get("sort") === "id") next.delete("sort");
      if (next.get("order") === "asc") next.delete("order");
      setParams(next, { replace: true });
    },
    [params, setParams]
  );

  // поиск с задержкой, чтобы не слать запрос на каждую букву
  useEffect(() => {
    if (search === q) return;
    const t = setTimeout(() => update({ q: search.trim(), page: 1 }), 350);
    return () => clearTimeout(t);
  }, [search, q, update]);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError("");
    fetchPets({ q, species, sort, order, page, page_size: PAGE_SIZE }, ctrl.signal)
      .then((res) => {
        const pages = Math.max(1, Math.ceil(res.total / PAGE_SIZE));
        if (res.total > 0 && page > pages) {
          update({ page: pages });
          return;
        }
        setData(res);
      })
      .catch((err) => {
        if (!isAbort(err)) setError(err.message);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, species, sort, order, page, reloadKey]);

  function reload() {
    setRecords({});
    setExpanded(null);
    setReloadKey((n) => n + 1);
  }

  function toggleSort(key) {
    if (sort === key) update({ order: order === "asc" ? "desc" : "asc", page: 1 });
    else update({ sort: key, order: "asc", page: 1 });
  }

  async function toggleRecords(petId) {
    if (expanded === petId) {
      setExpanded(null);
      return;
    }
    setExpanded(petId);
    if (records[petId]) return;
    try {
      const list = await api.records(petId);
      setRecords((prev) => ({ ...prev, [petId]: list }));
    } catch (err) {
      toast.error(err.message);
      setExpanded(null);
    }
  }

  async function addPet(payload) {
    setSaving(true);
    setFormError("");
    try {
      const pet = await api.createPet(payload);
      setAdding(false);
      toast.success(`Питомец «${pet.name}» добавлен.`);
      navigate(`/pets/${pet.id}`);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const from = data.total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, data.total);
  const filtered = Boolean(q || species);

  return (
    <>
      <section className="panel" aria-labelledby="pets-title">
        <div className="panel-head">
          <div className="panel-title-row">
            <h2 id="pets-title">Питомцы</h2>
            <button
              type="button"
              className="icon-add"
              onClick={() => {
                setFormError("");
                setAdding(true);
              }}
              aria-label="Добавить питомца"
              title="Добавить питомца"
            >
              +
            </button>
          </div>
          <button type="button" onClick={reload} disabled={loading}>
            {loading ? "Загрузка…" : "Загрузить питомцев"}
          </button>
        </div>

        <div className="toolbar">
          <label className="search">
            <span className="sr-only">Поиск</span>
            <input
              type="search"
              placeholder="Поиск по кличке, породе или владельцу"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="seg" role="group" aria-label="Фильтр по виду">
            {SPECIES_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={species === f.value ? "seg-btn is-active" : "seg-btn"}
                aria-pressed={species === f.value}
                onClick={() => update({ species: f.value, page: 1 })}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="msg error">
            {error}{" "}
            <button type="button" className="linkish" onClick={reload}>
              Повторить
            </button>
          </p>
        )}

        {data.items.length > 0 && (
          <div className={loading ? "table-wrap is-loading" : "table-wrap"}>
            <table className="pets-table">
              <thead>
                <tr>
                  <th aria-label="Медкарта"></th>
                  {COLUMNS.map((c) => (
                    <th
                      key={c.label}
                      className={c.hideSm ? "hide-sm" : undefined}
                      aria-sort={
                        c.sort && sort === c.sort
                          ? order === "asc"
                            ? "ascending"
                            : "descending"
                          : undefined
                      }
                    >
                      {c.sort ? (
                        <button
                          type="button"
                          className="th-sort"
                          onClick={() => toggleSort(c.sort)}
                        >
                          {c.label}
                          <span aria-hidden="true" className="th-arrow">
                            {sort === c.sort ? (order === "asc" ? "▲" : "▼") : "↕"}
                          </span>
                        </button>
                      ) : (
                        c.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <Fragment key={p.id}>
                    <tr>
                      <td>
                        <button
                          type="button"
                          className="linkish"
                          aria-expanded={expanded === p.id}
                          aria-label={
                            expanded === p.id
                              ? `Скрыть медкарту: ${p.name}`
                              : `Показать медкарту: ${p.name}`
                          }
                          onClick={() => toggleRecords(p.id)}
                        >
                          {expanded === p.id ? "▾" : "▸"}
                        </button>
                      </td>
                      <td>
                        <Link to={`/pets/${p.id}`} className="pet-link">
                          {p.name}
                        </Link>
                      </td>
                      <td>
                        <span className={`species-pill ${p.species}`}>
                          {SPECIES_LABEL[p.species] || p.species}
                        </span>
                      </td>
                      <td className="hide-sm">{p.breed || "—"}</td>
                      <td>{ageLabel(p.birth_date)}</td>
                      <td>{formatWeight(p.weight_kg)}</td>
                      <td className="hide-sm">{p.owner_name || "—"}</td>
                    </tr>
                    {expanded === p.id && (
                      <tr className="records-row">
                        <td colSpan={7}>
                          <div className="records-block">
                            <strong>Медкарта</strong>
                            {!records[p.id] && <span className="muted">загрузка…</span>}
                            {records[p.id] && records[p.id].length === 0 && (
                              <p className="muted">Записей нет</p>
                            )}
                            {records[p.id] && records[p.id].length > 0 && (
                              <ul>
                                {records[p.id].map((r) => (
                                  <li key={r.id}>
                                    <span className="visit-date">{formatDate(r.visit_date)}</span>
                                    {r.diagnosis ? ` — ${r.diagnosis}` : ""}
                                    {r.treatment ? `; лечение: ${r.treatment}` : ""}
                                    {r.vaccination ? `; вакцинация: ${r.vaccination}` : ""}
                                    {r.notes ? ` (${r.notes})` : ""}
                                  </li>
                                ))}
                              </ul>
                            )}
                            <Link to={`/pets/${p.id}?tab=records`} className="more-link">
                              Открыть карточку →
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {loading && data.items.length === 0 && <p className="empty">Загрузка списка…</p>}
        {!loading && data.items.length === 0 && !error && (
          <p className="empty">
            {filtered
              ? "По вашему запросу ничего не найдено."
              : "Список пуст. Нажмите «+», чтобы добавить первого питомца."}
          </p>
        )}

        {data.total > 0 && (
          <div className="list-footer">
            <span className="muted">
              {from}–{to} из {data.total} {pluralize(data.total, ["питомца", "питомцев", "питомцев"])}
            </span>
            <Pagination page={page} pages={pages} onChange={(n) => update({ page: n })} />
          </div>
        )}
      </section>

      {adding && (
        <Modal title="Добавить питомца" onClose={() => setAdding(false)} busy={saving}>
          <PetForm
            submitLabel="Добавить"
            saving={saving}
            error={formError}
            onSubmit={addPet}
            onCancel={() => setAdding(false)}
          />
        </Modal>
      )}
    </>
  );
}
