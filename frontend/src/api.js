export const SPECIES_LABEL = { dog: "собака", cat: "кошка" };

export const SPECIES_OPTIONS = [
  { value: "dog", label: "собака" },
  { value: "cat", label: "кошка" },
];

const FIELD_LABEL = {
  name: "Кличка",
  species: "Вид",
  weight_kg: "Вес",
  birth_date: "Дата рождения",
  visit_date: "Дата приёма",
  logged_on: "Дата",
};

const ERROR_TEXT = {
  missing: "обязательное поле",
  greater_than: "значение должно быть больше нуля",
  less_than_equal: "слишком большое значение",
  string_too_short: "слишком короткое значение",
  date_parsing: "некорректная дата",
  date_from_datetime_parsing: "некорректная дата",
  literal_error: "недопустимое значение",
};

export function pluralize(n, [one, few, many]) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

function parseIso(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  return { y, m, d };
}

export function formatDate(iso) {
  if (!iso) return "—";
  const { y, m, d } = parseIso(iso);
  return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
}

export function monthsBetween(birthDate, now = new Date()) {
  const { y, m, d } = parseIso(birthDate);
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  if (now.getDate() < d) months -= 1;
  return Math.max(0, months);
}

export function ageFromMonths(months) {
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${months} мес.`;
  if (rem === 0) return `${years} г.`;
  return `${years} г. ${rem} мес.`;
}

export function ageLabel(birthDate) {
  return ageFromMonths(monthsBetween(birthDate));
}

export function formatWeight(value) {
  return `${Number(value).toFixed(2).replace(/\.?0+$/, "")} кг`;
}

export function todayIso() {
  const t = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function errorMessage(status, detail) {
  if (status === 502) {
    return "Сервис расчёта нормы недоступен (502). Попробуйте позже.";
  }
  if (status === 404) return detail || "Не найдено (404).";
  if (status === 422) return detail || "Некорректные данные (422).";
  return detail || `Ошибка запроса (${status || "сеть"}).`;
}

function describeItem(item) {
  const field = FIELD_LABEL[item.loc?.[item.loc.length - 1]];
  const text =
    ERROR_TEXT[item.type] ||
    String(item.msg || "").replace(/^Value error, /, "") ||
    "некорректное значение";
  return field ? `${field}: ${text}` : text;
}

export async function readError(res) {
  try {
    const data = await res.json();
    const d = data.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return d.map(describeItem).join("; ");
    return null;
  } catch {
    return null;
  }
}

export async function request(path, { method = "GET", body, signal } = {}) {
  const hasBody = body !== undefined;
  let res;
  try {
    res = await fetch(path, {
      method,
      signal,
      headers: hasBody ? { "Content-Type": "application/json" } : undefined,
      body: hasBody ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new ApiError(0, "Не удалось связаться с сервером.");
  }
  if (!res.ok) {
    throw new ApiError(res.status, errorMessage(res.status, await readError(res)));
  }
  return res.status === 204 ? null : res.json();
}

export function isAbort(err) {
  return err && err.name === "AbortError";
}

export function fetchPets(params = {}, signal) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, v);
  });
  const suffix = qs.toString() ? `?${qs}` : "";
  return request(`/api/pets${suffix}`, { signal });
}

function query(opts = {}) {
  const qs = new URLSearchParams();
  Object.entries(opts).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "" && v !== false) qs.set(k, String(v));
  });
  return qs.toString() ? `?${qs}` : "";
}

export const FOOD_OPTIONS = [
  { value: "dry", label: "сухой корм" },
  { value: "mixed", label: "смешанный" },
  { value: "wet", label: "влажный корм" },
];

export const ACTIVITY_OPTIONS = [
  { value: "low", label: "низкая" },
  { value: "normal", label: "обычная" },
  { value: "high", label: "высокая" },
];

export const api = {
  stats: (signal) => request("/api/stats", { signal }),
  pet: (id, signal) => request(`/api/pets/${id}`, { signal }),
  createPet: (body) => request("/api/pets", { method: "POST", body }),
  updatePet: (id, body) => request(`/api/pets/${id}`, { method: "PUT", body }),
  deletePet: (id) => request(`/api/pets/${id}`, { method: "DELETE" }),
  records: (id, signal) => request(`/api/pets/${id}/records`, { signal }),
  createRecord: (id, body) =>
    request(`/api/pets/${id}/records`, { method: "POST", body }),
  updateRecord: (id, rid, body) =>
    request(`/api/pets/${id}/records/${rid}`, { method: "PUT", body }),
  deleteRecord: (id, rid) =>
    request(`/api/pets/${id}/records/${rid}`, { method: "DELETE" }),
  weights: (id, signal) => request(`/api/pets/${id}/weights`, { signal }),
  addWeight: (id, body) =>
    request(`/api/pets/${id}/weights`, { method: "POST", body }),
  deleteWeight: (id, wid) =>
    request(`/api/pets/${id}/weights/${wid}`, { method: "DELETE" }),
  feedingNorm: (id, opts) => request(`/api/pets/${id}/feeding-norm${query(opts)}`),
  waterNorm: (id, opts) => request(`/api/pets/${id}/water-norm${query(opts)}`),
  mealPlan: (id, opts) => request(`/api/pets/${id}/meal-plan${query(opts)}`),
  humanAge: (id, signal) => request(`/api/pets/${id}/human-age`, { signal }),
  vaccinations: (id, signal) =>
    request(`/api/pets/${id}/vaccination-schedule`, { signal }),
};
