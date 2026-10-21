import { useCallback, useEffect, useState } from "react";
import ConfirmDialog from "./ConfirmDialog.jsx";
import DatePicker from "./DatePicker.jsx";
import Modal from "./Modal.jsx";
import { useToast } from "./Toast.jsx";
import { api, formatDate, isAbort, todayIso } from "./api.js";

const EMPTY = { visit_date: "", diagnosis: "", treatment: "", vaccination: "", notes: "" };

function RecordForm({ initial, submitLabel, saving, error, onSubmit, onCancel }) {
  const [form, setForm] = useState(initial);
  const [localError, setLocalError] = useState("");
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  function submit(e) {
    e.preventDefault();
    if (!form.visit_date) {
      setLocalError("Укажите дату приёма.");
      return;
    }
    setLocalError("");
    const clean = (v) => v.trim() || null;
    onSubmit({
      visit_date: form.visit_date,
      diagnosis: clean(form.diagnosis),
      treatment: clean(form.treatment),
      vaccination: clean(form.vaccination),
      notes: clean(form.notes),
    });
  }

  const message = localError || error;
  return (
    <>
      <form onSubmit={submit} className="form modal-form">
        <label className="field" htmlFor="rf-date">
          Дата приёма
          <DatePicker
            id="rf-date"
            value={form.visit_date}
            onChange={(v) => setForm({ ...form, visit_date: v })}
            required
          />
        </label>
        <label>
          Диагноз
          <input autoFocus value={form.diagnosis} onChange={set("diagnosis")} />
        </label>
        <label>
          Лечение
          <input value={form.treatment} onChange={set("treatment")} />
        </label>
        <label>
          Вакцинация
          <input value={form.vaccination} onChange={set("vaccination")} />
        </label>
        <label className="wide">
          Заметки
          <textarea rows={3} value={form.notes} onChange={set("notes")} />
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

export default function RecordsTab({ petId }) {
  const toast = useToast();
  const [records, setRecords] = useState(null);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null); // {type: "add" | "edit" | "delete", record?}
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(
    (signal) =>
      api
        .records(petId, signal)
        .then((list) => {
          setRecords([...list].reverse());
          setError("");
        })
        .catch((err) => {
          if (!isAbort(err)) setError(err.message);
        }),
    [petId]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    setRecords(null);
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  function close() {
    if (busy) return;
    setDialog(null);
    setFormError("");
  }

  async function save(payload) {
    setBusy(true);
    setFormError("");
    try {
      if (dialog.type === "edit") {
        await api.updateRecord(petId, dialog.record.id, payload);
        toast.success("Запись обновлена.");
      } else {
        await api.createRecord(petId, payload);
        toast.success("Запись добавлена.");
      }
      setDialog(null);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.deleteRecord(petId, dialog.record.id);
      toast.success("Запись удалена.");
      setDialog(null);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const editing = dialog?.type === "edit" ? dialog.record : null;

  return (
    <section className="panel" aria-labelledby="records-title">
      <div className="panel-head">
        <h2 id="records-title">Медицинская карта</h2>
        <button
          type="button"
          onClick={() => {
            setFormError("");
            setDialog({ type: "add" });
          }}
        >
          Добавить запись
        </button>
      </div>

      {error && (
        <p className="msg error">
          {error}{" "}
          <button type="button" className="linkish" onClick={() => load()}>
            Повторить
          </button>
        </p>
      )}
      {!records && !error && <p className="empty">Загрузка медкарты…</p>}
      {records && records.length === 0 && (
        <p className="empty">Записей пока нет. Добавьте первый приём.</p>
      )}

      {records && records.length > 0 && (
        <ol className="timeline">
          {records.map((r) => (
            <li key={r.id} className="timeline-item">
              <div className="timeline-date">{formatDate(r.visit_date)}</div>
              <div className="timeline-body">
                <p className="timeline-title">{r.diagnosis || "Приём без диагноза"}</p>
                {r.treatment && (
                  <p><span className="muted">Лечение:</span> {r.treatment}</p>
                )}
                {r.vaccination && (
                  <p>
                    <span className="tag">Вакцинация</span> {r.vaccination}
                  </p>
                )}
                {r.notes && <p className="muted">{r.notes}</p>}
                <div className="item-actions">
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => {
                      setFormError("");
                      setDialog({ type: "edit", record: r });
                    }}
                  >
                    Изменить
                  </button>
                  <button
                    type="button"
                    className="linkish danger-soft"
                    onClick={() => setDialog({ type: "delete", record: r })}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {(dialog?.type === "add" || editing) && (
        <Modal
          title={editing ? "Изменить запись" : "Новая запись"}
          onClose={close}
          busy={busy}
        >
          <RecordForm
            initial={
              editing
                ? {
                    visit_date: editing.visit_date,
                    diagnosis: editing.diagnosis || "",
                    treatment: editing.treatment || "",
                    vaccination: editing.vaccination || "",
                    notes: editing.notes || "",
                  }
                : { ...EMPTY, visit_date: todayIso() }
            }
            submitLabel={editing ? "Сохранить" : "Добавить"}
            saving={busy}
            error={formError}
            onSubmit={save}
            onCancel={close}
          />
        </Modal>
      )}

      {dialog?.type === "delete" && (
        <ConfirmDialog
          title="Удалить запись?"
          text={`Запись от ${formatDate(dialog.record.visit_date)} будет удалена из медкарты.`}
          busy={busy}
          onConfirm={remove}
          onCancel={close}
        />
      )}
    </section>
  );
}
