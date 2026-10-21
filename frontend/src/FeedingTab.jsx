import { useEffect, useState } from "react";
import CustomSelect from "./CustomSelect.jsx";
import { ACTIVITY_OPTIONS, FOOD_OPTIONS, api } from "./api.js";

export default function FeedingTab({ pet }) {
  const [opts, setOpts] = useState({
    food_type: "dry",
    activity: "normal",
    neutered: false,
    first_meal: "08:00",
    last_meal: "20:00",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // после смены веса прежний расчёт устарел
  useEffect(() => {
    setResult(null);
    setError("");
  }, [pet.id, pet.weight_kg]);

  const adult = pet.age_months >= 12;

  async function calc() {
    if (opts.last_meal <= opts.first_meal) {
      setError("Последний приём должен быть позже первого.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const [norm, water, plan] = await Promise.all([
        api.feedingNorm(pet.id, {
          food_type: opts.food_type,
          activity: opts.activity,
          neutered: opts.neutered,
        }),
        api.waterNorm(pet.id, { food_type: opts.food_type }),
        api.mealPlan(pet.id, opts),
      ]);
      setResult({ norm, water, plan });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const set = (key) => (value) => setOpts({ ...opts, [key]: value });
  const norm = result?.norm;

  return (
    <section className="panel panel-feed" aria-labelledby="feeding-title">
      <div className="panel-head">
        <h2 id="feeding-title">Норма кормления</h2>
        <button type="button" className="grain" onClick={calc} disabled={loading}>
          {loading ? "Расчёт…" : "Рассчитать норму кормления"}
        </button>
      </div>
      <p className="muted feed-hint">
        Расчёт по текущему весу и возрасту питомца выполняет отдельный web-сервис.
      </p>

      <div className="form feed-options">
        <label className="field" htmlFor="fo-food">
          Тип корма
          <CustomSelect
            id="fo-food"
            value={opts.food_type}
            onChange={set("food_type")}
            options={FOOD_OPTIONS}
          />
        </label>
        <label className="field" htmlFor="fo-activity">
          Активность
          <CustomSelect
            id="fo-activity"
            value={opts.activity}
            onChange={set("activity")}
            options={ACTIVITY_OPTIONS}
            disabled={!adult}
          />
        </label>
        <label>
          Первый приём
          <input
            type="time"
            value={opts.first_meal}
            onChange={(e) => set("first_meal")(e.target.value)}
            required
          />
        </label>
        <label>
          Последний приём
          <input
            type="time"
            value={opts.last_meal}
            onChange={(e) => set("last_meal")(e.target.value)}
            required
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={opts.neutered}
            disabled={!adult}
            onChange={(e) => set("neutered")(e.target.checked)}
          />
          Стерилизован / кастрирован
        </label>
      </div>
      {!adult && (
        <p className="muted feed-hint">
          Активность и стерилизация учитываются только для взрослых животных (от 12 мес.).
        </p>
      )}

      {error && <p className="msg error">{error}</p>}

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
              <span className="value">{result.water.daily_ml}</span>
              <span className="label">мл воды / сутки</span>
            </div>
          </div>

          <h3 className="sub-title">Расписание кормлений</h3>
          <ul className="meal-list">
            {result.plan.meals.map((m) => (
              <li key={m.time}>
                <span className="meal-time">{m.time}</span>
                <span>{m.grams} г</span>
                <span className="muted">{m.kcal} ккал</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
