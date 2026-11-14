import fs from "node:fs";
import path from "node:path";
import {
  ESTADOS_SEGUIMIENTO,
  INDICADORES,
  INICIOS,
  ORIGENES_MEDICION,
  TIPOS_REGISTRO,
  ZONAS,
  type DatosAviso,
  type DatosBitacora,
  type DatosChequeo,
  type DatosFoto,
  type DatosMotora,
  type DatosSintoma,
  type DatosVital,
  type EstadoDia,
  type EtapaId,
  type Registro,
  type Resumen,
  type TipoRegistro,
} from "../compartido/catalogos.ts";
import { ahora, dirFotos, hoy } from "./config.ts";
import { bd, transaccion } from "./db.ts";
import { entero, invalido, noEncontrado, numero, texto, unoDe } from "./errores.ts";
import { encolar } from "./salida-ia.ts";
import { nuevoId } from "./seguridad.ts";

const TIPOS = TIPOS_REGISTRO.map((t) => t.id);
const ZONA_IDS = ZONAS.map((z) => z.id);
const INICIO_IDS = INICIOS.map((i) => i.id);
const SEGUIMIENTO_IDS = ESTADOS_SEGUIMIENTO.map((e) => e.id);

interface Fila {
  id: string;
  tipo: string;
  fecha: string;
  etapa: string;
  datos: string;
  creado: string;
  actualizado: string;
  revisiones?: number;
}

const aRegistro = (f: Fila): Registro => ({
  id: f.id,
  tipo: f.tipo as TipoRegistro,
  fecha: f.fecha,
  etapa: f.etapa as EtapaId,
  datos: JSON.parse(f.datos),
  creado: f.creado,
  actualizado: f.actualizado,
  revisiones: Number(f.revisiones ?? 0),
});

function resumen(v: unknown, obligatorio: boolean): Resumen | null {
  if (!v || typeof v !== "object") {
    if (obligatorio) throw invalido("Falta el resumen.");
    return null;
  }
  const r = v as Record<string, unknown>;
  return {
    texto: texto(r.texto, 2000, "el resumen", obligatorio),
    origen: unoDe(r.origen, ["ia", "automatico", "simulado"] as const, "El origen del resumen"),
    editado: !!r.editado,
  };
}

// ---------- Validación por tipo ----------

export function validarSintoma(d: any, previo?: DatosSintoma): DatosSintoma {
  return {
    zona: unoDe(d?.zona, ZONA_IDS, "La zona"),
    manifestacion: texto(d?.manifestacion, 60, "el síntoma", true),
    intensidad: entero(d?.intensidad, 1, 5, "La intensidad"),
    inicio: unoDe(d?.inicio, INICIO_IDS, "El inicio"),
    notas: texto(d?.notas, 1000, "las notas"),
    estado: d?.estado ? unoDe(d.estado, ["activo", "resuelto"] as const, "El estado") : (previo?.estado ?? "activo"),
    seguimientos: previo?.seguimientos ?? [],
  };
}

function validarVital(d: any): DatosVital {
  const ind = INDICADORES.find((i) => i.id === d?.indicador);
  if (!ind) throw invalido("El indicador no es válido.");
  const datos: DatosVital = {
    indicador: ind.id,
    valor: numero(d.valor, ind.min, ind.max, ind.nombre),
    origen: unoDe(d.origen ?? "manual", ORIGENES_MEDICION.map((o) => o.id), "El origen"),
    medidoEn: typeof d.medidoEn === "string" && !Number.isNaN(Date.parse(d.medidoEn)) ? new Date(d.medidoEn).toISOString() : ahora(),
  };
  if (ind.dos) datos.valor2 = numero(d.valor2, ind.min, ind.max, `${ind.nombre} (segundo valor)`);
  return datos;
}

function validarMotora(d: any): DatosMotora {
  if (d?.prueba !== "reaccion_visual") throw invalido("La prueba no es válida.");
  if (!Array.isArray(d.intentos) || d.intentos.length < 3 || d.intentos.length > 20)
    throw invalido("La prueba necesita entre 3 y 20 intentos.");
  const intentos: number[] = d.intentos.map((n: unknown) => Math.round(numero(n, 80, 5000, "Cada intento")));
  const orden = [...intentos].sort((a, b) => a - b);
  const mitad = Math.floor(orden.length / 2);
  // Las estadísticas se calculan aquí, no se aceptan del cliente.
  const datos: DatosMotora = {
    prueba: "reaccion_visual",
    intentos,
    mediana: orden.length % 2 ? orden[mitad] : Math.round((orden[mitad - 1] + orden[mitad]) / 2),
    media: Math.round(intentos.reduce((a, b) => a + b, 0) / intentos.length),
    mejor: orden[0],
    anticipos: entero(d.anticipos ?? 0, 0, 99, "Los anticipos"),
  };
  const r = resumen(d.resumen, false);
  if (r) datos.resumen = r;
  return datos;
}

function validarBitacora(d: any): DatosBitacora {
  return { entrada: texto(d?.entrada, 8000, "la entrada", true), resumen: resumen(d?.resumen, false) };
}

function validarAviso(d: any): DatosAviso {
  return {
    titulo: texto(d?.titulo, 100, "el título", true),
    detalle: texto(d?.detalle, 1000, "el detalle"),
    alcance: unoDe(d?.alcance, ["local", "simulacro"] as const, "El alcance"),
    estado: d?.estado ? unoDe(d.estado, ["abierto", "cerrado"] as const, "El estado") : "abierto",
  };
}

export function validarChequeo(d: any): DatosChequeo {
  const seguimiento = Array.isArray(d?.seguimiento) ? d.seguimiento : [];
  const nuevos = Array.isArray(d?.nuevos) ? d.nuevos : [];
  if (seguimiento.length > 50 || nuevos.length > 10) throw invalido("El chequeo tiene demasiados elementos.");
  return {
    animo: entero(d?.animo, 1, 5, "El ánimo"),
    animoTexto: texto(d?.animoTexto, 1000, "cómo te sientes"),
    suenoHoras: d?.suenoHoras === null || d?.suenoHoras === undefined || d?.suenoHoras === "" ? null : numero(d.suenoHoras, 0, 24, "Las horas de sueño"),
    estres: entero(d?.estres, 1, 5, "El estrés"),
    seguimiento: seguimiento.map((s: any) => ({
      sintomaId: texto(s?.sintomaId, 60, "el síntoma", true),
      zona: texto(s?.zona, 40, "la zona"),
      manifestacion: texto(s?.manifestacion, 60, "el síntoma"),
      estado: unoDe(s?.estado, SEGUIMIENTO_IDS, "El seguimiento"),
      ...(s?.intensidad ? { intensidad: entero(s.intensidad, 1, 5, "La intensidad") } : {}),
    })),
    nuevos: nuevos.map((n: any) => {
      const s = validarSintoma(n);
      return { zona: s.zona, manifestacion: s.manifestacion, intensidad: s.intensidad, inicio: s.inicio, notas: s.notas };
    }),
    notas: texto(d?.notas, 2000, "las notas"),
    resumen: resumen(d?.resumen, true)!,
  };
}

function validar(tipo: TipoRegistro, datos: unknown, previo?: any): unknown {
  switch (tipo) {
    case "sintoma":
      return validarSintoma(datos, previo);
    case "vital":
      return validarVital(datos);
    case "motora":
      return validarMotora(datos);
    case "bitacora":
      return validarBitacora(datos);
    case "aviso":
      return validarAviso(datos);
    case "chequeo":
      return validarChequeo(datos);
    case "foto":
      return previo; // la foto solo se cambia tomando otra
  }
}

// ---------- Operaciones (siempre acotadas al perfil) ----------

export function insertar(
  perfilId: string,
  tipo: TipoRegistro,
  datos: unknown,
  etapa: EtapaId,
  opciones: { fecha?: string; creado?: string } = {},
): Registro {
  const id = nuevoId();
  const creado = opciones.creado ?? ahora();
  bd()
    .prepare(
      "INSERT INTO registros(id, perfil_id, tipo, fecha, etapa, datos, creado, actualizado) VALUES(?,?,?,?,?,?,?,?)",
    )
    .run(id, perfilId, tipo, opciones.fecha ?? hoy(), etapa, JSON.stringify(datos), creado, creado);
  encolar(perfilId, id, tipo, "creado");
  return obtener(perfilId, id);
}

/** Crea un registro desde la API. La etapa es la actual del perfil. */
export function crear(perfilId: string, etapa: EtapaId, tipo: unknown, datos: unknown): Registro {
  const t = unoDe(tipo, ["sintoma", "vital", "motora", "bitacora", "aviso"] as const, "El tipo");
  return insertar(perfilId, t, validar(t, datos), etapa);
}

const SELECT = `SELECT r.*, (SELECT COUNT(*) FROM revisiones v WHERE v.registro_id = r.id) AS revisiones FROM registros r`;

export function obtener(perfilId: string, id: string): Registro {
  const f = bd().prepare(`${SELECT} WHERE r.id = ? AND r.perfil_id = ?`).get(id, perfilId) as Fila | undefined;
  if (!f) throw noEncontrado("Ese registro no existe.");
  return aRegistro(f);
}

export function listar(
  perfilId: string,
  filtros: { tipo?: string; desde?: string; hasta?: string; fecha?: string; limite?: number } = {},
): Registro[] {
  const cond = ["r.perfil_id = ?"];
  const args: (string | number)[] = [perfilId];
  if (filtros.tipo) {
    const tipos = filtros.tipo.split(",").filter((t) => TIPOS.includes(t as TipoRegistro));
    if (tipos.length) {
      cond.push(`r.tipo IN (${tipos.map(() => "?").join(",")})`);
      args.push(...tipos);
    }
  }
  if (filtros.fecha) (cond.push("r.fecha = ?"), args.push(filtros.fecha));
  if (filtros.desde) (cond.push("r.fecha >= ?"), args.push(filtros.desde));
  if (filtros.hasta) (cond.push("r.fecha <= ?"), args.push(filtros.hasta));
  const limite = Math.min(Math.max(filtros.limite ?? 500, 1), 2000);
  const filas = bd()
    .prepare(`${SELECT} WHERE ${cond.join(" AND ")} ORDER BY r.fecha DESC, r.creado DESC LIMIT ${limite}`)
    .all(...args) as unknown as Fila[];
  return filas.map(aRegistro);
}

export function revisiones(perfilId: string, id: string) {
  obtener(perfilId, id);
  const filas = bd()
    .prepare("SELECT id, datos, motivo, reemplazado FROM revisiones WHERE registro_id = ? AND perfil_id = ? ORDER BY reemplazado DESC")
    .all(id, perfilId) as unknown as { id: string; datos: string; motivo: string; reemplazado: string }[];
  return filas.map((f) => ({ id: f.id, datos: JSON.parse(f.datos), motivo: f.motivo, reemplazado: f.reemplazado }));
}

/** Reemplaza los datos y guarda la versión anterior en el historial. */
function reemplazar(perfilId: string, actual: Registro, datos: unknown, motivo: string): Registro {
  const t = ahora();
  bd()
    .prepare("INSERT INTO revisiones(id, registro_id, perfil_id, datos, motivo, reemplazado) VALUES(?,?,?,?,?,?)")
    .run(nuevoId(), actual.id, perfilId, JSON.stringify(actual.datos), motivo, t);
  bd()
    .prepare("UPDATE registros SET datos = ?, actualizado = ? WHERE id = ? AND perfil_id = ?")
    .run(JSON.stringify(datos), t, actual.id, perfilId);
  encolar(perfilId, actual.id, actual.tipo, "corregido");
  return obtener(perfilId, actual.id);
}

export function corregir(perfilId: string, id: string, datos: unknown, motivo: unknown): Registro {
  const actual = obtener(perfilId, id);
  if (actual.tipo === "foto") throw invalido("La foto no se corrige: toma una nueva o elimínala.");
  const nuevos = validar(actual.tipo, datos, actual.datos);
  return transaccion(() => reemplazar(perfilId, actual, nuevos, texto(motivo, 200, "el motivo")));
}

export function eliminar(perfilId: string, id: string) {
  const r = obtener(perfilId, id);
  bd().prepare("DELETE FROM registros WHERE id = ? AND perfil_id = ?").run(id, perfilId);
  encolar(perfilId, id, r.tipo, "eliminado");
  if (r.tipo === "foto" && r.datos.archivo) {
    fs.rmSync(path.join(dirFotos(), perfilId, r.datos.archivo), { force: true });
  }
}

// ---------- Síntomas ----------

export function sintomasActivos(perfilId: string): Registro<DatosSintoma>[] {
  return listar(perfilId, { tipo: "sintoma" }).filter((r) => r.datos.estado === "activo");
}

/** Anota un seguimiento en el síntoma y actualiza su estado e intensidad. */
export function seguirSintoma(
  perfilId: string,
  id: string,
  s: { estado: string; intensidad?: number; nota?: string },
  motivo = "Seguimiento",
): Registro<DatosSintoma> {
  const actual = obtener(perfilId, id) as Registro<DatosSintoma>;
  if (actual.tipo !== "sintoma") throw invalido("Ese registro no es un síntoma.");
  const estado = unoDe(s.estado, SEGUIMIENTO_IDS, "El seguimiento");
  const intensidad = s.intensidad ? entero(s.intensidad, 1, 5, "La intensidad") : undefined;
  const datos: DatosSintoma = {
    ...actual.datos,
    estado: estado === "resuelto" ? "resuelto" : "activo",
    intensidad: estado !== "resuelto" && intensidad ? intensidad : actual.datos.intensidad,
    seguimientos: [
      ...actual.datos.seguimientos,
      { fecha: hoy(), estado, ...(intensidad ? { intensidad } : {}), ...(s.nota ? { nota: texto(s.nota, 500, "la nota") } : {}) },
    ],
  };
  return reemplazar(perfilId, actual, datos, motivo) as Registro<DatosSintoma>;
}

// ---------- Chequeo diario ----------

/** Guarda el chequeo, aplica los seguimientos y crea los síntomas nuevos. */
export function guardarChequeo(perfilId: string, etapa: EtapaId, entrada: unknown) {
  const datos = validarChequeo(entrada);
  return transaccion(() => {
    for (const s of datos.seguimiento) {
      seguirSintoma(perfilId, s.sintomaId, { estado: s.estado, intensidad: s.intensidad }, "Seguimiento en el chequeo diario");
    }
    const creados = datos.nuevos.map((n) =>
      insertar(perfilId, "sintoma", { ...n, estado: "activo", seguimientos: [] } satisfies DatosSintoma, etapa),
    );
    if (datos.suenoHoras !== null) {
      insertar(perfilId, "vital", { indicador: "sueno", valor: datos.suenoHoras, origen: "manual", medidoEn: ahora() } satisfies DatosVital, etapa);
    }
    const chequeo = insertar(perfilId, "chequeo", datos, etapa);
    bd().prepare("DELETE FROM borradores WHERE perfil_id = ? AND clave = 'chequeo'").run(perfilId);
    return { chequeo, sintomasNuevos: creados };
  });
}

// ---------- Foto diaria ----------

export function guardarFoto(perfilId: string, etapa: EtapaId, e: any): Registro<DatosFoto> {
  const fecha = hoy();
  let datos: DatosFoto;
  if (e?.omitida) {
    datos = { omitida: true, motivo: texto(e.motivo, 200, "el motivo") || "Cámara no disponible" };
  } else {
    const m = typeof e?.imagen === "string" ? /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(e.imagen) : null;
    if (!m) throw invalido("La imagen no es válida.");
    const bytes = Buffer.from(m[2], "base64");
    if (bytes.length < 100 || bytes.length > 6_000_000) throw invalido("La imagen debe pesar menos de 6 MB.");
    const dir = path.join(dirFotos(), perfilId);
    fs.mkdirSync(dir, { recursive: true });
    const archivo = `${fecha}.${m[1] === "jpeg" ? "jpg" : m[1]}`;
    for (const viejo of fs.readdirSync(dir)) if (viejo.startsWith(fecha + ".")) fs.rmSync(path.join(dir, viejo));
    fs.writeFileSync(path.join(dir, archivo), bytes);
    datos = { omitida: false, archivo };
  }
  // Una foto por perfil y fecha: la nueva reemplaza a la del mismo día.
  const previas = bd().prepare("SELECT id FROM registros WHERE perfil_id = ? AND tipo = 'foto' AND fecha = ?").all(perfilId, fecha) as { id: string }[];
  for (const p of previas) {
    bd().prepare("DELETE FROM registros WHERE id = ?").run(p.id);
    encolar(perfilId, p.id, "foto", "eliminado");
  }
  return insertar(perfilId, "foto", datos, etapa, { fecha });
}

export function rutaFoto(perfilId: string, fecha: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const f = bd()
    .prepare("SELECT datos FROM registros WHERE perfil_id = ? AND tipo = 'foto' AND fecha = ?")
    .get(perfilId, fecha) as { datos: string } | undefined;
  const archivo = f ? (JSON.parse(f.datos) as DatosFoto).archivo : undefined;
  if (!archivo) return null;
  const ruta = path.join(dirFotos(), perfilId, path.basename(archivo));
  return fs.existsSync(ruta) ? ruta : null;
}

// ---------- Estado del día ----------

export function estadoDia(perfilId: string): EstadoDia {
  const fecha = hoy();
  const filas = bd()
    .prepare("SELECT tipo, datos FROM registros WHERE perfil_id = ? AND fecha = ? AND tipo IN ('foto','chequeo','motora','bitacora')")
    .all(perfilId, fecha) as unknown as { tipo: string; datos: string }[];
  const foto = filas.find((f) => f.tipo === "foto");
  const e: EstadoDia = {
    fecha,
    foto: !foto ? "pendiente" : (JSON.parse(foto.datos) as DatosFoto).omitida ? "omitida" : "hecha",
    chequeo: filas.some((f) => f.tipo === "chequeo"),
    motora: filas.some((f) => f.tipo === "motora"),
    bitacora: filas.some((f) => f.tipo === "bitacora"),
    siguiente: null,
  };
  e.siguiente = e.foto === "pendiente" ? "foto" : !e.chequeo ? "chequeo" : !e.motora ? "motora" : !e.bitacora ? "bitacora" : null;
  return e;
}

// ---------- Borradores (para reanudar pasos a medias) ----------

export function leerBorrador(perfilId: string, clave: string) {
  const f = bd().prepare("SELECT datos, actualizado FROM borradores WHERE perfil_id = ? AND clave = ?").get(perfilId, clave) as
    | { datos: string; actualizado: string }
    | undefined;
  return f ? { datos: JSON.parse(f.datos), actualizado: f.actualizado } : null;
}
export function guardarBorrador(perfilId: string, clave: string, datos: unknown) {
  const json = JSON.stringify(datos ?? null);
  if (json.length > 50_000) throw invalido("El borrador es demasiado grande.");
  bd()
    .prepare(
      "INSERT INTO borradores(perfil_id, clave, datos, actualizado) VALUES(?,?,?,?) ON CONFLICT(perfil_id, clave) DO UPDATE SET datos = excluded.datos, actualizado = excluded.actualizado",
    )
    .run(perfilId, clave, json, ahora());
}
export function borrarBorrador(perfilId: string, clave: string) {
  bd().prepare("DELETE FROM borradores WHERE perfil_id = ? AND clave = ?").run(perfilId, clave);
}

// ---------- Importación de mediciones (CSV) ----------

/** Formato: fecha_hora,indicador,valor[,valor2]. Devuelve cuántas filas entraron y los errores. */
export function importarVitales(perfilId: string, etapa: EtapaId, csv: unknown) {
  const contenido = texto(csv, 200_000, "el archivo", true);
  const lineas = contenido.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const errores: string[] = [];
  let importadas = 0;
  transaccion(() => {
    lineas.forEach((linea, i) => {
      const c = linea.split(/[,;\t]/).map((x) => x.trim());
      if (i === 0 && /fecha/i.test(c[0])) return; // encabezado
      try {
        const t = Date.parse(c[0]);
        if (Number.isNaN(t)) throw invalido("fecha no válida");
        const datos = validarVital({ indicador: c[1], valor: c[2], valor2: c[3], origen: "importada", medidoEn: new Date(t).toISOString() });
        const d = new Date(t);
        const p = (n: number) => String(n).padStart(2, "0");
        insertar(perfilId, "vital", datos, etapa, { fecha: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` });
        importadas++;
      } catch (e) {
        errores.push(`Línea ${i + 1}: ${(e as Error).message}`);
      }
    });
  });
  return { importadas, errores: errores.slice(0, 20) };
}
