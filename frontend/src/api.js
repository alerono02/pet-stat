export const SPECIES_LABEL = { dog: "собака", cat: "кошка" };

export const SPECIES_OPTIONS = [
  { value: "dog", label: "собака" },
  { value: "cat", label: "кошка" },
];

export function ageLabel(birthDate) {
  const birth = new Date(birthDate);
  const now = new Date();
  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  months = Math.max(0, months);
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${months} мес.`;
  if (rem === 0) return `${years} г.`;
  return `${years} г. ${rem} мес.`;
}

export function errorMessage(status, detail) {
  if (status === 502) {
    return "Сервис расчёта нормы недоступен (502). Попробуйте позже.";
  }
  if (status === 404) return "Питомец не найден (404).";
  if (status === 422) return detail || "Некорректные данные (422).";
  return detail || `Ошибка запроса (${status || "сеть"}).`;
}

export async function readError(res) {
  try {
    const data = await res.json();
    const d = data.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return d.map((x) => x.msg || JSON.stringify(x)).join("; ");
    return null;
  } catch {
    return null;
  }
}

export async function fetchPets() {
  const res = await fetch("/api/pets");
  if (!res.ok) {
    throw new Error(errorMessage(res.status, await readError(res)));
  }
  return res.json();
}
