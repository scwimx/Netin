import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Carga .env si existe (configuración local). Nunca se versiona.
const rutaEnv = path.join(RAIZ, ".env");
if (fs.existsSync(rutaEnv) && !process.env.NETIN_SIN_ENV) {
  try {
    process.loadEnvFile(rutaEnv);
  } catch {
    // Un .env mal formado no debe impedir que la app arranque.
  }
}

/** Carpeta de datos privados: base de datos y fotos. */
export const dirDatos = () => path.resolve(process.env.NETIN_DATOS ?? path.join(RAIZ, "datos"));
/** Carpeta de documentos locales que consulta el asistente. */
export const dirDocumentos = () =>
  path.resolve(process.env.NETIN_DOCUMENTOS ?? path.join(RAIZ, "documentos"));
export const dirFotos = () => path.join(dirDatos(), "fotos");
export const PUERTO = Number(process.env.NETIN_PUERTO ?? 4310);

/** Fecha local AAAA-MM-DD. NETIN_FECHA permite fijarla en pruebas. */
export function hoy(): string {
  if (process.env.NETIN_FECHA) return process.env.NETIN_FECHA;
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export const ahora = () => new Date().toISOString();
