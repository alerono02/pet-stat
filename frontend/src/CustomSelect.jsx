import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "— выберите —",
  disabled = false,
  required = false,
  id,
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 200 });
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();
  const autoId = useId();
  const triggerId = id || autoId;

  const selected = options.find((o) => String(o.value) === String(value));
  const label = selected ? selected.label : placeholder;

  const updateCoords = () => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const listH = listRef.current?.offsetHeight || 240;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < Math.min(listH, 240) + 8 && rect.top > listH;
    const top = openUp ? rect.top - Math.min(listH, 240) - 4 : rect.bottom + 4;
    setCoords({ top, left: rect.left, width: rect.width });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateCoords();
    const onScroll = () => updateCoords();
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, options]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e) => {
      const inRoot = rootRef.current?.contains(e.target);
      const inList = listRef.current?.contains(e.target);
      if (!inRoot && !inList) setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const idx = options.findIndex((o) => String(o.value) === String(value));
    setHighlight(idx >= 0 ? idx : 0);
  }, [open, options, value]);

  const handlePick = (opt) => {
    onChange(opt.value);
    setOpen(false);
  };

  const handleTriggerKey = (e) => {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  };

  const handleListKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && highlight >= 0) {
      e.preventDefault();
      handlePick(options[highlight]);
    } else if (e.key === "Home") {
      e.preventDefault();
      setHighlight(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setHighlight(options.length - 1);
    }
  };

  const list = open
    ? createPortal(
        <ul
          id={listId}
          ref={(el) => {
            listRef.current = el;
            if (el) el.focus();
          }}
          className="csel-list csel-list-portal"
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={
            highlight >= 0 ? `${listId}-opt-${highlight}` : undefined
          }
          onKeyDown={handleListKey}
          style={{
            top: coords.top,
            left: coords.left,
            width: coords.width,
          }}
        >
          {options.map((opt, i) => {
            const isActive = String(opt.value) === String(value);
            return (
              <li
                key={String(opt.value)}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={isActive}
                className={`csel-option ${isActive ? "is-selected" : ""} ${
                  i === highlight ? "is-highlight" : ""
                }`}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => handlePick(opt)}
              >
                {opt.label}
              </li>
            );
          })}
        </ul>,
        document.body
      )
    : null;

  return (
    <div className={`csel ${open ? "is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        id={triggerId}
        className={`csel-trigger ${!selected ? "is-placeholder" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleTriggerKey}
      >
        <span className="csel-label">{label}</span>
        <span className="csel-chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {required && (
        <input type="hidden" value={value ?? ""} required readOnly />
      )}
      {list}
    </div>
  );
}
