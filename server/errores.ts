/** Error con código HTTP y mensaje pensado para mostrarse al usuario. */
export class ErrorApp extends Error {
  estado: number;
  constructor(estado: number, mensaje: string) {
    super(mensaje);
    this.estado = estado;
  }
}
export const invalido = (m: string) => new ErrorApp(400, m);
export const noEncontrado = (m = "No se encontró lo que buscas.") => new ErrorApp(404, m);

export function texto(v: unknown, max: number, campo: string, obligatorio = false): string {
  const t = typeof v === "string" ? v.trim() : "";
  if (obligatorio && !t) throw invalido(`Falta ${campo}.`);
  if (t.length > max) throw invalido(`${campo} admite hasta ${max} caracteres.`);
  return t;
}
export function entero(v: unknown, min: number, max: number, campo: string): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw invalido(`${campo} debe estar entre ${min} y ${max}.`);
  return n;
}
export function numero(v: unknown, min: number, max: number, campo: string): number {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw invalido(`${campo} debe estar entre ${min} y ${max}.`);
  return n;
}
export function unoDe<T extends string>(v: unknown, opciones: readonly T[], campo: string): T {
  if (typeof v !== "string" || !opciones.includes(v as T)) throw invalido(`${campo} no es válido.`);
  return v as T;
}
