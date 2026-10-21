import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import ConfirmDialog from "./ConfirmDialog.jsx";
import Modal from "./Modal.jsx";
import PetForm, { petToForm } from "./PetForm.jsx";
import RecordsTab from "./RecordsTab.jsx";
import WeightTab from "./WeightTab.jsx";
import FeedingTab from "./FeedingTab.jsx";
import CareTab from "./CareTab.jsx";
import { useToast } from "./Toast.jsx";
import usePageTitle from "./usePageTitle.js";
import {
  SPECIES_LABEL,
  ageFromMonths,
  api,
  formatDate,
  formatWeight,
  isAbort,
} from "./api.js";

const TABS = [
  { id: "records", label: "Медкарта" },
  { id: "weight", label: "Вес" },
  { id: "feeding", label: "Кормление" },
  { id: "care", label: "Уход" },
];

export default function PetPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get("tab")) ? params.get("tab") : "records";

  const [pet, setPet] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  usePageTitle(pet ? pet.name : "Карточка питомца");

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    api
      .pet(id, ctrl.signal)
      .then(setPet)
      .catch((err) => {
        if (!isAbort(err)) setError(err);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [id, reload]);

  const refreshPet = useCallback(() => setReload((n) => n + 1), []);

  async function savePet(payload) {
    setBusy(true);
    setFormError("");
    try {
      await api.updatePet(id, payload);
      setEditing(false);
      toast.success("Данные питомца сохранены.");
      refreshPet();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removePet() {
    setBusy(true);
    try {
      await api.deletePet(id);
      toast.success(`Питомец «${pet.name}» удалён.`);
      navigate("/pets");
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
      setDeleting(false);
    }
  }

  if (loading && !pet) return <p className="empty">Загрузка карточки…</p>;

  if (error) {
    return (
      <section className="panel not-found">
        <h2>{error.status === 404 ? "Питомец не найден" : "Не удалось загрузить карточку"}</h2>
        <p className="muted">{error.message}</p>
        <div className="actions">
          <Link to="/pets" className="btn">К списку питомцев</Link>
          {error.status !== 404 && (
            <button type="button" className="btn-ghost" onClick={refreshPet}>
              Повторить
            </button>
          )}
        </div>
      </section>
    );
  }

  if (!pet) return null;

  return (
    <>
      <p className="breadcrumbs">
        <Link to="/pets">Питомцы</Link> <span aria-hidden="true">/</span> {pet.name}
      </p>

      <section className="panel pet-head" aria-labelledby="pet-name">
        <div className="pet-head-main">
          <div className={`avatar ${pet.species}`} aria-hidden="true">
            {pet.species === "cat" ? "🐱" : "🐶"}
          </div>
          <div>
            <h1 id="pet-name" className="pet-name">{pet.name}</h1>
            <p className="muted pet-sub">
              <span className={`species-pill ${pet.species}`}>
                {SPECIES_LABEL[pet.species] || pet.species}
              </span>{" "}
              {pet.breed || "порода не указана"}
            </p>
          </div>
        </div>
        <dl className="facts">
          <div>
            <dt>Возраст</dt>
            <dd>{ageFromMonths(pet.age_months)}</dd>
          </div>
          <div>
            <dt>Дата рождения</dt>
            <dd>{formatDate(pet.birth_date)}</dd>
          </div>
          <div>
            <dt>Вес</dt>
            <dd>{formatWeight(pet.weight_kg)}</dd>
          </div>
          <div>
            <dt>Владелец</dt>
            <dd>{pet.owner_name || "—"}</dd>
          </div>
        </dl>
        <div className="actions">
          <button
            type="button"
            onClick={() => {
              setFormError("");
              setEditing(true);
            }}
          >
            Редактировать
          </button>
          <button type="button" className="danger-ghost" onClick={() => setDeleting(true)}>
            Удалить
          </button>
        </div>
      </section>

      <div className="tabs" role="tablist" aria-label="Разделы карточки">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            className={tab === t.id ? "tab is-active" : "tab"}
            onClick={() => {
              const next = new URLSearchParams(params);
              next.set("tab", t.id);
              setParams(next, { replace: true });
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "records" && <RecordsTab petId={pet.id} />}
        {tab === "weight" && <WeightTab petId={pet.id} onChanged={refreshPet} />}
        {tab === "feeding" && <FeedingTab pet={pet} />}
        {tab === "care" && <CareTab pet={pet} />}
      </div>

      {editing && (
        <Modal title="Редактировать питомца" onClose={() => setEditing(false)} busy={busy}>
          <PetForm
            initial={petToForm(pet)}
            submitLabel="Сохранить"
            saving={busy}
            error={formError}
            onSubmit={savePet}
            onCancel={() => setEditing(false)}
          />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Удалить питомца?"
          text={`Карточка «${pet.name}», вся медкарта и дневник веса будут удалены без возможности восстановления.`}
          busy={busy}
          onConfirm={removePet}
          onCancel={() => setDeleting(false)}
        />
      )}
    </>
  );
}
