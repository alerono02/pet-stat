import { formatDate } from "./api.js";

const W = 640;
const H = 260;
const PAD = { top: 18, right: 22, bottom: 34, left: 48 };

function niceRange(min, max) {
  if (min === max) {
    const pad = Math.max(0.5, min * 0.1);
    return [Math.max(0, min - pad), max + pad];
  }
  const pad = (max - min) * 0.15;
  return [Math.max(0, min - pad), max + pad];
}

export default function WeightChart({ points }) {
  if (points.length === 0) return null;

  const times = points.map((p) => new Date(p.logged_on).getTime());
  const values = points.map((p) => Number(p.weight_kg));
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const [v0, v1] = niceRange(Math.min(...values), Math.max(...values));

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (t) => (t1 === t0 ? PAD.left + innerW / 2 : PAD.left + ((t - t0) / (t1 - t0)) * innerW);
  const y = (v) => PAD.top + innerH - ((v - v0) / (v1 - v0)) * innerH;

  const coords = points.map((p, i) => ({ x: x(times[i]), y: y(values[i]), p }));
  const line = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const base = PAD.top + innerH;
  const area = `${coords[0].x.toFixed(1)},${base} ${line} ${coords[coords.length - 1].x.toFixed(1)},${base}`;

  const ticks = Array.from({ length: 4 }, (_, i) => v0 + ((v1 - v0) * i) / 3);
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <figure className="chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`График веса: от ${Number(first.weight_kg)} кг (${formatDate(first.logged_on)}) до ${Number(last.weight_kg)} кг (${formatDate(last.logged_on)})`}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="chart-grid" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="chart-axis" x={PAD.left - 8} y={y(t) + 4} textAnchor="end">
              {t.toFixed(1)}
            </text>
          </g>
        ))}
        {coords.length > 1 && <polygon className="chart-area" points={area} />}
        {coords.length > 1 && <polyline className="chart-line" points={line} />}
        {coords.map((c) => (
          <circle key={c.p.id} className="chart-dot" cx={c.x} cy={c.y} r="4.5">
            <title>{`${formatDate(c.p.logged_on)}: ${Number(c.p.weight_kg)} кг`}</title>
          </circle>
        ))}
        <text
          className="chart-axis"
          x={coords[0].x}
          y={H - 10}
          textAnchor={coords.length > 1 ? "start" : "middle"}
        >
          {formatDate(first.logged_on)}
        </text>
        {coords.length > 1 && (
          <text className="chart-axis" x={coords[coords.length - 1].x} y={H - 10} textAnchor="end">
            {formatDate(last.logged_on)}
          </text>
        )}
        <text className="chart-axis" x={PAD.left - 8} y={12} textAnchor="end">
          кг
        </text>
      </svg>
    </figure>
  );
}
