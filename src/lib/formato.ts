const fmtFecha = new Intl.DateTimeFormat("es", { weekday: "long", day: "numeric", month: "long" });
const fmtCorta = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });
const fmtHora = new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit" });
const fmtFechaHora = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** "2026-11-14" → Date local (sin desfase de zona horaria). */
export const deFecha = (f: string) => {
  const [a, m, d] = f.split("-").map(Number);
  return new Date(a, m - 1, d);
};
export const fechaLarga = (f: string) => {
  const t = fmtFecha.format(deFecha(f));
  return t.charAt(0).toUpperCase() + t.slice(1);
};
export const fechaCorta = (f: string) => fmtCorta.format(deFecha(f));
export const hora = (iso: string) => fmtHora.format(new Date(iso));
export const fechaHora = (iso: string) => fmtFechaHora.format(new Date(iso));

export function haceCuanto(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "ahora";
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  const d = Math.round(s / 86400);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

export const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

export function edad(nacimiento: string | null): number | null {
  if (!nacimiento) return null;
  const n = deFecha(nacimiento);
  const h = new Date();
  let e = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) e--;
  return e;
}

export const saludo = () => {
  const h = new Date().getHours();
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
};
