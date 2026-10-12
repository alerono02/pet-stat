import { Fragment, useEffect, useState } from "react";
import CustomSelect from "./CustomSelect.jsx";
import DatePicker from "./DatePicker.jsx";
import {
  SPECIES_LABEL,
  SPECIES_OPTIONS,
  ageLabel,
  errorMessage,
  fetchPets,
  readError,
} from "./api.js";

const EMPTY_FORM = {
  name: "",
  species: "dog",
  breed: "",
  birth_date: "",
  weight_kg: "",
  owner_name: "",
};

export default function PetsPage() {
  const [pets, setPets] = useState([]);
  const [records, setRecords] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [loadingPets, setLoadingPets] = useState(false);
  const [petsError, setPetsError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    loadPets();
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  function openModal() {
    setForm(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setFormError("");
  }

  async function loadPets() {
    setLoadingPets(true);
    setPetsError("");
    try {
      setPets(await fetchPets());
    } catch (err) {
      setPetsError(err.message || "Не удалось связаться с сервером.");
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

  async function addPet(e) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    if (!form.birth_date) {
      setFormError("Укажите дату рождения.");
      setSaving(false);
      return;
    }
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
      setModalOpen(false);
      setForm(EMPTY_FORM);
      await loadPets();
    } catch {
      setFormError("Не удалось сохранить питомца.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="panel" aria-labelledby="pets-title">
        <div className="panel-head">
          <div className="panel-title-row">
            <h2 id="pets-title">Питомцы</h2>
            <button
              type="button"
              className="icon-add"
              onClick={openModal}
              aria-label="Добавить питомца"
              title="Добавить питомца"
            >
              +
            </button>
          </div>
          <button type="button" onClick={loadPets} disabled={loadingPets}>
            {loadingPets ? "Загрузка…" : "Загрузить питомцев"}
          </button>
        </div>
        {petsError && <p className="msg error">{petsError}</p>}
        {pets.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th aria-label="Медкарта"></th>
                  <th>Кличка</th>
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
                            {!records[p.id] && (
                              <span className="muted">загрузка…</span>
                            )}
                            {records[p.id] && records[p.id].length === 0 && (
                              <p className="muted">Записей нет</p>
                            )}
                            {records[p.id] && records[p.id].length > 0 && (
                              <ul>
                                {records[p.id].map((r) => (
                                  <li key={r.id}>
                                    <span className="visit-date">
                                      {r.visit_date}
                                    </span>
                                    {r.diagnosis ? ` — ${r.diagnosis}` : ""}
                                    {r.treatment
                                      ? `; лечение: ${r.treatment}`
                                      : ""}
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
        {loadingPets && pets.length === 0 && (
          <p className="empty">Загрузка списка…</p>
        )}
        {!loadingPets && pets.length === 0 && !petsError && (
          <p className="empty">
            Список пуст. Нажмите «+», чтобы добавить первого питомца.
          </p>
        )}
      </section>

      {modalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-title"
          >
            <div className="modal-head">
              <h2 id="add-title">Добавить питомца</h2>
              <button
                type="button"
                className="modal-close"
                onClick={closeModal}
                aria-label="Закрыть"
                disabled={saving}
              >
                ×
              </button>
            </div>
            <form onSubmit={addPet} className="form modal-form">
              <label>
                Кличка
                <input
                  required
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label className="field" htmlFor="species-select">
                Вид
                <CustomSelect
                  id="species-select"
                  value={form.species}
                  onChange={(v) => setForm({ ...form, species: v })}
                  options={SPECIES_OPTIONS}
                />
              </label>
              <label>
                Порода
                <input
                  value={form.breed}
                  onChange={(e) => setForm({ ...form, breed: e.target.value })}
                />
              </label>
              <label className="field" htmlFor="birth-date">
                Дата рождения
                <DatePicker
                  id="birth-date"
                  value={form.birth_date}
                  onChange={(v) => setForm({ ...form, birth_date: v })}
                  required
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
                  onChange={(e) =>
                    setForm({ ...form, weight_kg: e.target.value })
                  }
                />
              </label>
              <label>
                Владелец
                <input
                  value={form.owner_name}
                  onChange={(e) =>
                    setForm({ ...form, owner_name: e.target.value })
                  }
                />
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Отмена
                </button>
                <button type="submit" disabled={saving}>
                  {saving ? "Сохранение…" : "Добавить"}
                </button>
              </div>
            </form>
            {formError && <p className="msg error">{formError}</p>}
          </div>
        </div>
      )}
    </>
  );
}
