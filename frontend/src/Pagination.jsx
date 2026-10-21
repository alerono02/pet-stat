function pageList(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, pages, page - 1, page, page + 1]);
  const list = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out = [];
  list.forEach((n, i) => {
    if (i > 0 && n - list[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <nav className="pager" aria-label="Страницы">
      <button
        type="button"
        className="pager-btn"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Предыдущая страница"
      >
        ‹
      </button>
      {pageList(page, pages).map((n, i) =>
        n === "…" ? (
          <span key={`gap${i}`} className="pager-gap" aria-hidden="true">…</span>
        ) : (
          <button
            key={n}
            type="button"
            className={n === page ? "pager-btn is-active" : "pager-btn"}
            onClick={() => onChange(n)}
            aria-current={n === page ? "page" : undefined}
          >
            {n}
          </button>
        )
      )}
      <button
        type="button"
        className="pager-btn"
        onClick={() => onChange(page + 1)}
        disabled={page >= pages}
        aria-label="Следующая страница"
      >
        ›
      </button>
    </nav>
  );
}
