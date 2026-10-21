import Modal from "./Modal.jsx";

export default function ConfirmDialog({
  title,
  text,
  confirmLabel = "Удалить",
  busy = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal title={title} onClose={onCancel} busy={busy}>
      <p className="confirm-text">{text}</p>
      <div className="modal-actions">
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>
          Отмена
        </button>
        <button type="button" className="danger" onClick={onConfirm} disabled={busy} autoFocus>
          {busy ? "Подождите…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
