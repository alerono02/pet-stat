import { useCallback, useEffect, useState } from "react";
import ConfirmDialog from "./ConfirmDialog.jsx";
import DatePicker from "./DatePicker.jsx";
import WeightChart from "./WeightChart.jsx";
import { useToast } from "./Toast.jsx";
import { api, formatDate, formatWeight, isAbort, todayIso } from "./api.js";

export default function WeightTab({ petId, onChanged }) {
  const toast = useToast();
  const [logs, setLogs] = useState(null);
  const [error, setError] = useState("");
  const [date, setDate] = useState(todayIso());
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(
    (signal) =>
      api
        .weights(petId, signal)
        .then((list) => {
          setLogs(list);
          setError("");
        })
        .catch((err) => {
          if (!isAbort(err)) setError(err.message);
        }),
    [petId]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    setLogs(null);
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  async function add(e) {
    e.preventDefault();
    if (!date) {
      setFormError("Укажите дату.");
      return;
    }
    if (!(Number(weight) > 0)) {
      setFormError("Вес должен быть больше нуля.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await api.addWeight(petId, { logged_on: date, weight_kg: Number(weight) });
      setWeight("");
      toast.success("Вес записан.");
      await load();
      onChanged();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await api.deleteWeight(petId, toDelete.id);
      toast.success("Запись удалена.");
      setToDelete(null);
      await load();
      onChanged();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  }

  const newestFirst = logs ? [...logs].reverse() : [];

  return (
    <section className="panel" aria-labelledby="weight-title">
      <div className="panel-head">
        <h2 id="weight-title">Дневник веса</h2>
      </div>

      {error && (
        <p className="msg error">
          {error}{" "}
          <button type="button" className="linkish" onClick={() => load()}>
            Повторить
          </button>
        </p>
      )}
      {!logs && !error && <p className="empty">Загрузка…</p>}

      {logs && logs.length > 0 && <WeightChart points={logs} />}
      {logs && logs.length === 0 && <p className="empty">Измерений пока нет.</p>}

      <form className="weight-form" onSubmit={add}>
        <label className="field" htmlFor="wf-date">
          Дата
          <DatePicker id="wf-date" value={date} onChange={setDate} required />
        </label>
        <label>
          Вес, кг
          <input
            type="number"
            step="0.01"
            min="0.01"
            max="999.99"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={saving}>
          {saving ? "Сохранение…" : "Записать вес"}
        </button>
      </form>
      {formError && <p className="msg error">{formError}</p>}

      {newestFirst.length > 0 && (
        <div className="table-wrap weight-table">
          <table>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Вес</th>
                <th aria-label="Действия"></th>
              </tr>
            </thead>
            <tbody>
              {newestFirst.map((l) => (
                <tr key={l.id}>
                  <td>{formatDate(l.logged_on)}</td>
                  <td>{formatWeight(l.weight_kg)}</td>
                  <td className="cell-right">
                    <button
                      type="button"
                      className="linkish danger-soft"
                      onClick={() => setToDelete(l)}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Удалить измерение?"
          text={`Запись от ${formatDate(toDelete.logged_on)} (${formatWeight(toDelete.weight_kg)}) будет удалена.`}
          busy={deleting}
          onConfirm={remove}
          onCancel={() => !deleting && setToDelete(null)}
        />
      )}
    </section>
  );
}
