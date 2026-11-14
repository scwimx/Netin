import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { dirDatos, dirFotos } from "./config.ts";

let conexion: DatabaseSync | null = null;

const ESQUEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS perfiles (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT '',
  nacimiento TEXT,
  etapa TEXT NOT NULL DEFAULT 'tierra',
  clave_hash TEXT NOT NULL,
  demo INTEGER NOT NULL DEFAULT 0,
  archivado TEXT,
  ajustes TEXT NOT NULL DEFAULT '{}',
  creado TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sesiones (
  token_hash TEXT PRIMARY KEY,
  perfil_id TEXT NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  creado TEXT NOT NULL,
  expira TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS registros (
  id TEXT PRIMARY KEY,
  perfil_id TEXT NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  fecha TEXT NOT NULL,
  etapa TEXT NOT NULL,
  datos TEXT NOT NULL,
  creado TEXT NOT NULL,
  actualizado TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS registros_perfil ON registros(perfil_id, tipo, fecha);

-- Cada corrección guarda aquí la versión anterior del registro.
CREATE TABLE IF NOT EXISTS revisiones (
  id TEXT PRIMARY KEY,
  registro_id TEXT NOT NULL REFERENCES registros(id) ON DELETE CASCADE,
  perfil_id TEXT NOT NULL,
  datos TEXT NOT NULL,
  motivo TEXT NOT NULL DEFAULT '',
  reemplazado TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS borradores (
  perfil_id TEXT NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  clave TEXT NOT NULL,
  datos TEXT NOT NULL,
  actualizado TEXT NOT NULL,
  PRIMARY KEY (perfil_id, clave)
);

CREATE TABLE IF NOT EXISTS mensajes (
  id TEXT PRIMARY KEY,
  perfil_id TEXT NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  autor TEXT NOT NULL,           -- 'usuario' hoy; 'asistente' cuando exista la IA
  texto TEXT NOT NULL,
  meta TEXT NOT NULL DEFAULT '{}',
  creado TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS mensajes_perfil ON mensajes(perfil_id, creado);

-- Cola para la IA futura: cada reporte creado, corregido o eliminado deja
-- aquí un evento. El asistente, cuando exista, los leerá y marcará como procesados.
CREATE TABLE IF NOT EXISTS cola_ia (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  perfil_id TEXT NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  registro_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  accion TEXT NOT NULL,          -- 'creado' | 'corregido' | 'eliminado'
  creado TEXT NOT NULL,
  procesado TEXT
);
CREATE INDEX IF NOT EXISTS cola_ia_perfil ON cola_ia(perfil_id, procesado);

CREATE TABLE IF NOT EXISTS config (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
`;

export function abrir(): DatabaseSync {
  if (conexion) return conexion;
  fs.mkdirSync(dirDatos(), { recursive: true });
  fs.mkdirSync(dirFotos(), { recursive: true });
  conexion = new DatabaseSync(path.join(dirDatos(), "netin.db"));
  conexion.exec(ESQUEMA);
  return conexion;
}

export function cerrar() {
  conexion?.close();
  conexion = null;
}

export const bd = () => abrir();

/** Ejecuta fn dentro de una transacción. */
export function transaccion<T>(fn: () => T): T {
  const d = bd();
  d.exec("BEGIN");
  try {
    const r = fn();
    d.exec("COMMIT");
    return r;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}

export function leerConfig(clave: string): string | null {
  const f = bd().prepare("SELECT valor FROM config WHERE clave = ?").get(clave) as
    | { valor: string }
    | undefined;
  return f?.valor ?? null;
}
export function guardarConfig(clave: string, valor: string) {
  bd()
    .prepare(
      "INSERT INTO config(clave, valor) VALUES(?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor",
    )
    .run(clave, valor);
}
