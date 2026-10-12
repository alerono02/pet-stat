import { Fragment, useState } from "react";

const SPECIES_LABEL = { dog: "собака", cat: "кошка" };

function ageLabel(birthDate) {
  const birth = new Date(birthDate);
  const now = new Date();
  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  months = Math.max(0, months);
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${months} мес.`;
  if (rem === 0) return `${years} г.`;
  return `${years} г. ${rem} мес.`;
}

function errorMessage(status, detail) {
  if (status === 502) {
    return "Сервис расчёта нормы недоступен (502). Попробуйте позже.";
  }
  if (status === 404) return "Питомец не найден (404).";
  if (status === 422) return detail || "Некорректные данные (422).";
  return detail || `Ошибка запроса (${status || "сеть"}).`;
}

async function readError(res) {
  try {
    const data = await res.json();
    const d = data.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return d.map((x) => x.msg || JSON.stringify(x)).join("; ");
    return null;
  } catch {
    return null;
  }
}

export default function App() {
  const [pets, setPets] = useState([]);
  const [records, setRecords] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [loadingPets, setLoadingPets] = useState(false);
  const [petsError, setPetsError] = useState("");

  const [selectedId, setSelectedId] = useState("");
  const [norm, setNorm] = useState(null);
  const [loadingNorm, setLoadingNorm] = useState(false);
  const [normError, setNormError] = useState("");

  const [form, setForm] = useState({
    name: "",
    species: "dog",
    breed: "",
    birth_date: "",
    weight_kg: "",
    owner_name: "",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formOk, setFormOk] = useState("");

  async function loadPets() {
    setLoadingPets(true);
    setPetsError("");
    try {
      const res = await fetch("/api/pets");
      if (!res.ok) {
        setPetsError(errorMessage(res.status, await readError(res)));
        return;
      }
      const data = await res.json();
      setPets(data);
      if (data.length && !selectedId) setSelectedId(String(data[0].id));
    } catch {
      setPetsError("Не удалось связаться с сервером.");
    } finally {
      setLoadingPets(false);
    }
  }

  async function toggleRecords(petId) {
    if (expanded === petId) {
      setExpanded(null);
      return;
    }
    setExpanded(petId);
    if (records[petId]) return;
    try {
      const res = await fetch(`/api/pets/${petId}/records`);
      if (!res.ok) {
        setPetsError(errorMessage(res.status, await readError(res)));
        return;
      }
      const data = await res.json();
      setRecords((prev) => ({ ...prev, [petId]: data }));
    } catch {
      setPetsError("Не удалось загрузить медкарту.");
    }
  }

  async function calcNorm() {
    if (!selectedId) {
      setNormError("Сначала выберите питомца.");
      return;
    }
    setLoadingNorm(true);
    setNormError("");
    setNorm(null);
    try {
      const res = await fetch(`/api/pets/${selectedId}/feeding-norm`);
      if (!res.ok) {
        setNormError(errorMessage(res.status, await readError(res)));
        return;
      }
      setNorm(await res.json());
    } catch {
      setNormError("Не удалось рассчитать норму.");
    } finally {
      setLoadingNorm(false);
    }
  }

  async function addPet(e) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    setFormOk("");
    const payload = {
      name: form.name.trim(),
      species: form.species,
      breed: form.breed.trim() || null,
      birth_date: form.birth_date,
      weight_kg: Number(form.weight_kg),
      owner_name: form.owner_name.trim() || null,
    };
    try {
      const res = await fetch("/api/pets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setFormError(errorMessage(res.status, await readError(res)));
        return;
      }
      setFormOk("Питомец добавлен.");
      setForm({
        name: "",
        species: "dog",
        breed: "",
        birth_date: "",
        weight_kg: "",
        owner_name: "",
      });
      await loadPets();
    } catch {
      setFormError("Не удалось сохранить питомца.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <h1 className="brand">Учёт домашних животных</h1>
        <p className="hero-lead">
          Реестр питомцев, медкарта и суточная норма корма по весу и возрасту.
        </p>
        <div className="hero-actions">
          <button type="button" onClick={loadPets} disabled={loadingPets}>
            {loadingPets ? "Загрузка…" : "Загрузить питомцев"}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() =>
              document.getElementById("feeding")?.scrollIntoView({ behavior: "smooth" })
            }
          >
            К норме кормления
          </button>
        </div>
      </header>

      <section className="panel" aria-labelledby="pets-title">
        <div className="panel-head">
          <h2 id="pets-title">Питомцы</h2>
          <button type="button" onClick={loadPets} disabled={loadingPets}>
            {loadingPets ? "Загрузка…" : "Обновить список"}
          </button>
        </div>
        {petsError && <p className="msg error">{petsError}</p>}
        {pets.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th aria-label="Медкарта"></th>
                  <th>Имя</th>
                  <th>Вид</th>
                  <th>Порода</th>
                  <th>Возраст</th>
                  <th>Вес, кг</th>
                  <th>Владелец</th>
                </tr>
              </thead>
              <tbody>
                {pets.map((p) => (
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
                        <strong>{p.name}</strong>
                      </td>
                      <td>
                        <span className={`species-pill ${p.species}`}>
                          {SPECIES_LABEL[p.species] || p.species}
                        </span>
                      </td>
                      <td>{p.breed || "—"}</td>
                      <td>{ageLabel(p.birth_date)}</td>
                      <td>{Number(p.weight_kg).toFixed(2)}</td>
                      <td>{p.owner_name || "—"}</td>
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
                                    <span className="visit-date">{r.visit_date}</span>
                                    {r.diagnosis ? ` — ${r.diagnosis}` : ""}
                                    {r.treatment ? `; лечение: ${r.treatment}` : ""}
                                    {r.vaccination
                                      ? `; вакцинация: ${r.vaccination}`
                                      : ""}
                                    {r.notes ? ` (${r.notes})` : ""}
                                  </li>
                                ))}
                              </ul>
                            )}
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
        {!loadingPets && pets.length === 0 && !petsError && (
          <p className="empty">
            Нажмите «Загрузить питомцев», чтобы увидеть список.
          </p>
        )}
      </section>

      <section className="panel" id="feeding" aria-labelledby="feed-title">
        <div className="panel-head stack">
          <h2 id="feed-title">Норма кормления</h2>
        </div>
        <div className="row">
          <label>
            Питомец
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">— выберите —</option>
              {pets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({SPECIES_LABEL[p.species]})
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="grain"
            onClick={calcNorm}
            disabled={loadingNorm}
          >
            {loadingNorm ? "Расчёт…" : "Рассчитать норму кормления"}
          </button>
        </div>
        {normError && <p className="msg error">{normError}</p>}
        {norm && (
          <div className="norm">
            <p className="norm-meta">
              <strong>{norm.name}</strong>
              {`: ${norm.life_stage}, ${norm.age_months} мес., ${norm.weight_kg} кг`}
            </p>
            <div className="norm-grid">
              <div className="norm-stat">
                <span className="value kcal">{norm.daily_kcal}</span>
                <span className="label">ккал / сутки</span>
              </div>
              <div className="norm-stat">
                <span className="value">{norm.daily_grams}</span>
                <span className="label">граммов / сутки</span>
              </div>
              <div className="norm-stat">
                <span className="value">{norm.meals_per_day}</span>
                <span className="label">приёмов пищи</span>
              </div>
              <div className="norm-stat">
                <span className="value" style={{ fontSize: "1.25rem" }}>
                  {norm.life_stage}
                </span>
                <span className="label">стадия жизни</span>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="panel" aria-labelledby="add-title">
        <div className="panel-head">
          <h2 id="add-title">Добавить питомца</h2>
        </div>
        <form onSubmit={addPet} className="form">
          <label>
            Имя
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            Вид
            <select
              value={form.species}
              onChange={(e) => setForm({ ...form, species: e.target.value })}
            >
              <option value="dog">собака</option>
              <option value="cat">кошка</option>
            </select>
          </label>
          <label>
            Порода
            <input
              value={form.breed}
              onChange={(e) => setForm({ ...form, breed: e.target.value })}
            />
          </label>
          <label>
            Дата рождения
            <input
              type="date"
              required
              value={form.birth_date}
              onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
            />
          </label>
          <label>
            Вес, кг
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={form.weight_kg}
              onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
            />
          </label>
          <label>
            Владелец
            <input
              value={form.owner_name}
              onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
            />
          </label>
          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving ? "Сохранение…" : "Добавить"}
            </button>
          </div>
        </form>
        {formError && <p className="msg error">{formError}</p>}
        {formOk && <p className="msg ok">{formOk}</p>}
      </section>
    </div>
  );
}
