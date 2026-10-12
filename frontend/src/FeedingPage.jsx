import { useEffect, useMemo, useState } from "react";
import CustomSelect from "./CustomSelect.jsx";
import {
  SPECIES_LABEL,
  errorMessage,
  fetchPets,
  readError,
} from "./api.js";

export default function FeedingPage() {
  const [pets, setPets] = useState([]);
  const [loadingPets, setLoadingPets] = useState(false);
  const [petsError, setPetsError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [norm, setNorm] = useState(null);
  const [loadingNorm, setLoadingNorm] = useState(false);
  const [normError, setNormError] = useState("");

  useEffect(() => {
    loadPets();
  }, []);

  async function loadPets() {
    setLoadingPets(true);
    setPetsError("");
    try {
      const data = await fetchPets();
      setPets(data);
      if (data.length && !selectedId) setSelectedId(String(data[0].id));
    } catch (err) {
      setPetsError(err.message || "Не удалось загрузить питомцев.");
    } finally {
      setLoadingPets(false);
    }
  }

  const petOptions = useMemo(
    () => [
      { value: "", label: "— выберите —" },
      ...pets.map((p) => ({
        value: String(p.id),
        label: `${p.name} (${SPECIES_LABEL[p.species] || p.species})`,
      })),
    ],
    [pets]
  );

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

  return (
    <section className="panel panel-feed" aria-labelledby="feed-title">
      <div className="panel-head">
        <h2 id="feed-title">Норма кормления</h2>
        <button type="button" onClick={loadPets} disabled={loadingPets}>
          {loadingPets ? "Загрузка…" : "Обновить список"}
        </button>
      </div>
      <p className="muted feed-hint">
        Выберите питомца и рассчитайте суточную норму через web-сервис.
      </p>
      {petsError && <p className="msg error">{petsError}</p>}
      <div className="row">
        <label className="field" htmlFor="pet-select">
          Питомец
          <CustomSelect
            id="pet-select"
            value={selectedId}
            onChange={setSelectedId}
            options={petOptions}
            placeholder="— выберите —"
            disabled={loadingPets}
          />
        </label>
        <button
          type="button"
          className="grain"
          onClick={calcNorm}
          disabled={loadingNorm || !pets.length}
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
  );
}
