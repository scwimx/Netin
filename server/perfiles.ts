import fs from "node:fs";
import path from "node:path";
import {
  AJUSTES_POR_DEFECTO,
  ETAPAS,
  type AjustesPerfil,
  type EtapaId,
  type Perfil,
} from "../compartido/catalogos.ts";
import { ahora, dirFotos } from "./config.ts";
import { bd } from "./db.ts";
import { ErrorApp, invalido, noEncontrado, texto, unoDe } from "./errores.ts";
import {
  anotarFallo,
  bloqueado,
  hashClave,
  hashToken,
  limpiarFallos,
  nuevoId,
  nuevoToken,
  verificarClave,
} from "./seguridad.ts";

const ETAPA_IDS = ETAPAS.map((e) => e.id);
const DIAS_SESION = 14;
export const CLAVE_MINIMA = 8;

interface Fila {
  id: string;
  nombre: string;
  rol: string;
  nacimiento: string | null;
  etapa: string;
  clave_hash: string;
  demo: number;
  archivado: string | null;
  ajustes: string;
  creado: string;
}

function aPerfil(f: Fila): Perfil {
  let ajustes: Partial<AjustesPerfil> = {};
  try {
    ajustes = JSON.parse(f.ajustes);
  } catch {
    // ajustes dañados: se usan los valores por defecto
  }
  return {
    id: f.id,
    nombre: f.nombre,
    rol: f.rol,
    nacimiento: f.nacimiento,
    etapa: f.etapa as EtapaId,
    demo: !!f.demo,
    archivado: !!f.archivado,
    creado: f.creado,
    ajustes: { ...AJUSTES_POR_DEFECTO, ...ajustes },
  };
}

function fila(id: string): Fila {
  const f = bd().prepare("SELECT * FROM perfiles WHERE id = ?").get(id) as Fila | undefined;
  if (!f) throw noEncontrado("Ese perfil no existe.");
  return f;
}

function validarClave(clave: unknown): string {
  if (typeof clave !== "string" || clave.length < CLAVE_MINIMA)
    throw invalido(`La contraseña necesita al menos ${CLAVE_MINIMA} caracteres.`);
  if (clave.length > 200) throw invalido("La contraseña es demasiado larga.");
  return clave;
}

/** Lista pública para la pantalla de selección: sin datos de salud. */
export function listar() {
  const filas = bd().prepare("SELECT * FROM perfiles ORDER BY creado").all() as unknown as Fila[];
  return filas.map((f) => ({
    id: f.id,
    nombre: f.nombre,
    rol: f.rol,
    etapa: f.etapa,
    demo: !!f.demo,
    archivado: !!f.archivado,
  }));
}

export function crear(e: { nombre: unknown; rol?: unknown; clave: unknown; etapa?: unknown; demo?: boolean }): Perfil {
  const nombre = texto(e.nombre, 60, "el nombre", true);
  const rol = texto(e.rol, 60, "el rol");
  const clave = validarClave(e.clave);
  const etapa = e.etapa ? unoDe(e.etapa, ETAPA_IDS, "La etapa") : "tierra";
  const id = nuevoId();
  bd()
    .prepare(
      "INSERT INTO perfiles(id, nombre, rol, etapa, clave_hash, demo, ajustes, creado) VALUES(?,?,?,?,?,?,?,?)",
    )
    .run(id, nombre, rol, etapa, hashClave(clave), e.demo ? 1 : 0, JSON.stringify(AJUSTES_POR_DEFECTO), ahora());
  return porId(id);
}

export const porId = (id: string) => aPerfil(fila(id));

/** Comprueba la contraseña con freno ante intentos repetidos. */
export function comprobarClave(perfilId: string, clave: unknown) {
  const espera = bloqueado(perfilId);
  if (espera) throw new ErrorApp(429, `Demasiados intentos. Espera ${espera} s y prueba de nuevo.`);
  const f = fila(perfilId);
  if (typeof clave !== "string" || !verificarClave(clave, f.clave_hash)) {
    anotarFallo(perfilId);
    throw new ErrorApp(401, "La contraseña no coincide.");
  }
  limpiarFallos(perfilId);
  return f;
}

export function iniciarSesion(perfilId: string, clave: unknown): { token: string; perfil: Perfil } {
  const f = comprobarClave(perfilId, clave);
  if (f.archivado) throw new ErrorApp(403, "Este perfil está archivado. Restáuralo para entrar.");
  return { token: abrirSesion(perfilId), perfil: aPerfil(f) };
}

export function abrirSesion(perfilId: string): string {
  const token = nuevoToken();
  const expira = new Date(Date.now() + DIAS_SESION * 864e5).toISOString();
  bd()
    .prepare("INSERT INTO sesiones(token_hash, perfil_id, creado, expira) VALUES(?,?,?,?)")
    .run(hashToken(token), perfilId, ahora(), expira);
  bd().prepare("DELETE FROM sesiones WHERE expira < ?").run(ahora());
  return token;
}

export function perfilDeToken(token: string | undefined): Perfil | null {
  if (!token) return null;
  const s = bd()
    .prepare("SELECT perfil_id, expira FROM sesiones WHERE token_hash = ?")
    .get(hashToken(token)) as { perfil_id: string; expira: string } | undefined;
  if (!s || s.expira < ahora()) return null;
  const f = bd().prepare("SELECT * FROM perfiles WHERE id = ?").get(s.perfil_id) as Fila | undefined;
  if (!f || f.archivado) return null;
  return aPerfil(f);
}

export function cerrarSesion(token: string | undefined) {
  if (token) bd().prepare("DELETE FROM sesiones WHERE token_hash = ?").run(hashToken(token));
}

export function actualizar(
  id: string,
  c: { nombre?: unknown; rol?: unknown; nacimiento?: unknown; etapa?: unknown; ajustes?: unknown },
): Perfil {
  const actual = porId(id);
  const nombre = c.nombre !== undefined ? texto(c.nombre, 60, "el nombre", true) : actual.nombre;
  const rol = c.rol !== undefined ? texto(c.rol, 60, "el rol") : actual.rol;
  let nacimiento = actual.nacimiento;
  if (c.nacimiento !== undefined) {
    const n = texto(c.nacimiento, 10, "la fecha de nacimiento");
    if (n && !/^\d{4}-\d{2}-\d{2}$/.test(n)) throw invalido("La fecha de nacimiento no es válida.");
    nacimiento = n || null;
  }
  const etapa = c.etapa !== undefined ? unoDe(c.etapa, ETAPA_IDS, "La etapa") : actual.etapa;
  let ajustes = actual.ajustes;
  if (c.ajustes && typeof c.ajustes === "object") {
    const a = c.ajustes as Record<string, unknown>;
    ajustes = {
      camaraActiva: typeof a.camaraActiva === "boolean" ? a.camaraActiva : ajustes.camaraActiva,
      camaraId: typeof a.camaraId === "string" || a.camaraId === null ? (a.camaraId as string | null) : ajustes.camaraId,
      respuestasBreves: typeof a.respuestasBreves === "boolean" ? a.respuestasBreves : ajustes.respuestasBreves,
      comoLlamarte: a.comoLlamarte !== undefined ? texto(a.comoLlamarte, 30, "el nombre corto") : ajustes.comoLlamarte,
    };
  }
  bd()
    .prepare("UPDATE perfiles SET nombre=?, rol=?, nacimiento=?, etapa=?, ajustes=? WHERE id=?")
    .run(nombre, rol, nacimiento, etapa, JSON.stringify(ajustes), id);
  return porId(id);
}

export function cambiarClave(id: string, actual: unknown, nueva: unknown) {
  comprobarClave(id, actual);
  const clave = validarClave(nueva);
  bd().prepare("UPDATE perfiles SET clave_hash=? WHERE id=?").run(hashClave(clave), id);
  // Cierra las demás sesiones abiertas con la contraseña anterior.
  bd().prepare("DELETE FROM sesiones WHERE perfil_id=?").run(id);
}

export function archivar(id: string, clave: unknown) {
  comprobarClave(id, clave);
  bd().prepare("UPDATE perfiles SET archivado=? WHERE id=?").run(ahora(), id);
  bd().prepare("DELETE FROM sesiones WHERE perfil_id=?").run(id);
}

export function restaurar(id: string, clave: unknown) {
  comprobarClave(id, clave);
  bd().prepare("UPDATE perfiles SET archivado=NULL WHERE id=?").run(id);
}

/** Borra el perfil con todos sus datos y fotos. No se puede deshacer. */
export function eliminar(id: string, clave: unknown) {
  comprobarClave(id, clave);
  bd().prepare("DELETE FROM perfiles WHERE id=?").run(id);
  fs.rmSync(path.join(dirFotos(), id), { recursive: true, force: true });
}
