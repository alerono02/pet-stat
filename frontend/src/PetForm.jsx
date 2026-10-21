import { useState } from "react";
import CustomSelect from "./CustomSelect.jsx";
import DatePicker from "./DatePicker.jsx";
import { SPECIES_OPTIONS } from "./api.js";

const EMPTY = {
  name: "",
  species: "dog",
  breed: "",
  birth_date: "",
  weight_kg: "",
  owner_name: "",
};

export function petToForm(pet) {
  return {
    name: pet.name,
    species: pet.species,
    breed: pet.breed || "",
    birth_date: pet.birth_date,
    weight_kg: String(Number(pet.weight_kg)),
    owner_name: pet.owner_name || "",
  };
}

export default function PetForm({
  initial = EMPTY,
  submitLabel,
  saving,
  error,
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(initial);
  const [localError, setLocalError] = useState("");
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setLocalError("Укажите кличку.");
      return;
    }
    if (!form.birth_date) {
      setLocalError("Укажите дату рождения.");
      return;
    }
    if (!(Number(form.weight_kg) > 0)) {
      setLocalError("Вес должен быть больше нуля.");
      return;
    }
    setLocalError("");
    onSubmit({
      name: form.name.trim(),
      species: form.species,
      breed: form.breed.trim() || null,
      birth_date: form.birth_date,
      weight_kg: Number(form.weight_kg),
      owner_name: form.owner_name.trim() || null,
    });
  }

  const message = localError || error;

  return (
    <>
      <form onSubmit={handleSubmit} className="form modal-form">
        <label>
          Кличка
          <input required autoFocus value={form.name} onChange={set("name")} />
        </label>
        <label className="field" htmlFor="pf-species">
          Вид
          <CustomSelect
            id="pf-species"
            value={form.species}
            onChange={(v) => setForm({ ...form, species: v })}
            options={SPECIES_OPTIONS}
          />
        </label>
        <label>
          Порода
          <input value={form.breed} onChange={set("breed")} />
        </label>
        <label className="field" htmlFor="pf-birth">
          Дата рождения
          <DatePicker
            id="pf-birth"
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
            max="999.99"
            required
            value={form.weight_kg}
            onChange={set("weight_kg")}
          />
        </label>
        <label>
          Владелец
          <input value={form.owner_name} onChange={set("owner_name")} />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>
            Отмена
          </button>
          <button type="submit" disabled={saving}>
            {saving ? "Сохранение…" : submitLabel}
          </button>
        </div>
      </form>
      {message && <p className="msg error">{message}</p>}
    </>
  );
}
