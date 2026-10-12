import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const WEEKDAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

function pad(n) {
  return String(n).padStart(2, "0");
}

function toIso(y, m, d) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function parseIso(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDisplay(iso) {
  const dt = parseIso(iso);
  if (!dt) return "";
  return `${pad(dt.getDate())}.${pad(dt.getMonth() + 1)}.${dt.getFullYear()}`;
}

function startOfMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  let dow = first.getDay();
  dow = dow === 0 ? 6 : dow - 1;
  return new Date(year, month, 1 - dow);
}

export default function DatePicker({
  value,
  onChange,
  maxDate,
  required = false,
  id,
  placeholder = "дд.мм.гггг",
}) {
  const today = useMemo(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  }, []);
  const max = maxDate ? parseIso(maxDate) || today : today;

  const initial = parseIso(value) || today;
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 288 });
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const panelId = useId();
  const autoId = useId();
  const triggerId = id || autoId;

  const updateCoords = () => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const panelH = panelRef.current?.offsetHeight || 340;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < panelH + 8 && rect.top > panelH;
    const top = openUp ? rect.top - panelH - 4 : rect.bottom + 4;
    const width = Math.max(rect.width, 288);
    let left = rect.left;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    setCoords({ top, left, width });
  };

  useEffect(() => {
    const dt = parseIso(value);
    if (dt) {
      setViewYear(dt.getFullYear());
      setViewMonth(dt.getMonth());
    }
  }, [value]);

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
  }, [open, viewMonth, viewYear]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e) => {
      const inRoot = rootRef.current?.contains(e.target);
      const inPanel = panelRef.current?.contains(e.target);
      if (!inRoot && !inPanel) setOpen(false);
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

  const days = useMemo(() => {
    const start = startOfMonthGrid(viewYear, viewMonth);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [viewYear, viewMonth]);

  const handlePrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };

  const handleNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  const canGoNext = () => {
    if (viewYear > max.getFullYear()) return false;
    if (viewYear === max.getFullYear() && viewMonth >= max.getMonth()) return false;
    return true;
  };

  const handlePick = (d) => {
    const cell = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (cell > max) return;
    onChange(toIso(d.getFullYear(), d.getMonth(), d.getDate()));
    setOpen(false);
  };

  const isSameDay = (a, b) =>
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const selected = parseIso(value);

  const panel = open
    ? createPortal(
        <div
          id={panelId}
          ref={panelRef}
          className="dpick-panel dpick-panel-portal"
          role="dialog"
          aria-label="Выбор даты"
          style={{
            top: coords.top,
            left: coords.left,
            width: coords.width,
          }}
        >
          <div className="dpick-nav">
            <button
              type="button"
              className="dpick-nav-btn"
              aria-label="Предыдущий месяц"
              onClick={handlePrev}
            >
              ‹
            </button>
            <div className="dpick-title">
              {MONTHS[viewMonth]} {viewYear}
            </div>
            <button
              type="button"
              className="dpick-nav-btn"
              aria-label="Следующий месяц"
              disabled={!canGoNext()}
              onClick={handleNext}
            >
              ›
            </button>
          </div>
          <div className="dpick-weekdays">
            {WEEKDAYS.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          <div className="dpick-grid">
            {days.map((d) => {
              const inMonth = d.getMonth() === viewMonth;
              const cell = new Date(d.getFullYear(), d.getMonth(), d.getDate());
              const disabled = cell > max;
              const isSelected = isSameDay(d, selected);
              const isToday = isSameDay(d, today);
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  disabled={disabled}
                  className={[
                    "dpick-day",
                    inMonth ? "" : "is-out",
                    isSelected ? "is-selected" : "",
                    isToday ? "is-today" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handlePick(d)}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
          <div className="dpick-footer">
            <button
              type="button"
              className="dpick-today"
              onClick={() => handlePick(today)}
            >
              Сегодня
            </button>
            {value && (
              <button
                type="button"
                className="dpick-clear"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                Очистить
              </button>
            )}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className={`dpick ${open ? "is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        id={triggerId}
        className={`dpick-trigger ${!value ? "is-placeholder" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{value ? formatDisplay(value) : placeholder}</span>
        <span className="dpick-icon" aria-hidden="true">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="3"
              y="5"
              width="18"
              height="16"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="M3 10h18"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M8 3v4M16 3v4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <circle cx="8" cy="14" r="1.1" fill="currentColor" />
            <circle cx="12" cy="14" r="1.1" fill="currentColor" />
            <circle cx="16" cy="14" r="1.1" fill="currentColor" />
          </svg>
        </span>
      </button>
      {required && (
        <input type="hidden" value={value || ""} required readOnly />
      )}
      {panel}
    </div>
  );
}
