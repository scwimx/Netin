import { indicador, nombreZona, type Registro } from "../compartido/catalogos.ts";
import { ahora } from "./config.ts";
import { bd } from "./db.ts";

// Salida de datos hacia la IA futura.
//
// Cada vez que un reporte se crea, se corrige o se elimina, queda un evento en
// la tabla cola_ia. La IA, cuando se integre, debe:
//   1. Leer los eventos pendientes de un perfil (pendientes()).
//   2. Usar el paquete de cada registro: separa lo REPORTADO por la persona,
//      lo MEDIDO por la app o un equipo y los datos de contexto (etapa, fecha).
//   3. Marcar los eventos como procesados (marcarProcesados()).
// Nada de esto sale del equipo: no hay conexión externa.

export type Accion = "creado" | "corregido" | "eliminado";

export function encolar(perfilId: string, registroId: string, tipo: string, accion: Accion) {
  bd()
    .prepare("INSERT INTO cola_ia(perfil_id, registro_id, tipo, accion, creado) VALUES(?,?,?,?,?)")
    .run(perfilId, registroId, tipo, accion, ahora());
}

/** Paquete estructurado de un registro, listo para que lo consuma un modelo. */
export function paquete(r: Registro) {
  const d = r.datos;
  const base = { id: r.id, tipo: r.tipo, fecha: r.fecha, etapa: r.etapa, creado: r.creado, actualizado: r.actualizado, revisiones: r.revisiones };
  switch (r.tipo) {
    case "sintoma":
      return {
        ...base,
        reportado: {
          zona: d.zona,
          zonaNombre: nombreZona(d.zona),
          manifestacion: d.manifestacion,
          intensidad: d.intensidad,
          inicio: d.inicio,
          notas: d.notas,
          estado: d.estado,
          seguimientos: d.seguimientos,
        },
      };
    case "chequeo":
      return {
        ...base,
        reportado: {
          animo: d.animo,
          animoTexto: d.animoTexto,
          suenoHoras: d.suenoHoras,
          estres: d.estres,
          seguimiento: d.seguimiento,
          nuevos: d.nuevos,
          notas: d.notas,
        },
        resumen: d.resumen,
      };
    case "bitacora":
      return { ...base, reportado: { entrada: d.entrada }, resumen: d.resumen };
    case "motora":
      return {
        ...base,
        medido: { prueba: d.prueba, unidad: "ms", intentos: d.intentos, mediana: d.mediana, media: d.media, mejor: d.mejor, anticipos: d.anticipos },
      };
    case "vital":
      return {
        ...base,
        medido: {
          indicador: d.indicador,
          nombre: indicador(d.indicador)?.nombre,
          unidad: indicador(d.indicador)?.unidad,
          valor: d.valor,
          valor2: d.valor2 ?? null,
          origen: d.origen,
          medidoEn: d.medidoEn,
        },
      };
    case "aviso":
      return { ...base, reportado: { titulo: d.titulo, detalle: d.detalle, alcance: d.alcance, estado: d.estado } };
    case "foto":
      // La imagen no viaja en el paquete; la IA puede pedirla aparte por fecha.
      return { ...base, contexto: { fotoDisponible: !d.omitida, motivoOmision: d.motivo ?? null } };
  }
}

interface FilaCola {
  id: number;
  registro_id: string;
  tipo: string;
  accion: Accion;
  creado: string;
}

export function pendientes(perfilId: string, limite = 200) {
  const filas = bd()
    .prepare("SELECT id, registro_id, tipo, accion, creado FROM cola_ia WHERE perfil_id = ? AND procesado IS NULL ORDER BY id LIMIT ?")
    .all(perfilId, Math.min(Math.max(limite, 1), 1000)) as unknown as FilaCola[];
  const leer = bd().prepare(
    "SELECT r.*, (SELECT COUNT(*) FROM revisiones v WHERE v.registro_id = r.id) AS revisiones FROM registros r WHERE r.id = ? AND r.perfil_id = ?",
  );
  const leerMensaje = bd().prepare("SELECT id, autor, texto, meta, creado FROM mensajes WHERE id = ? AND perfil_id = ?");
  return filas.map((f) => {
    if (f.tipo === "mensaje") {
      const m = leerMensaje.get(f.registro_id, perfilId) as any;
      return {
        evento: f.id, accion: f.accion, tipo: f.tipo, registroId: f.registro_id, en: f.creado,
        datos: m ? { id: m.id, tipo: "mensaje", creado: m.creado, ...JSON.parse(m.meta), reportado: { autor: m.autor, texto: m.texto } } : null,
      };
    }
    const fila = leer.get(f.registro_id, perfilId) as any;
    const registro: Registro | null = fila
      ? { ...fila, datos: JSON.parse(fila.datos), revisiones: Number(fila.revisiones) }
      : null;
    return { evento: f.id, accion: f.accion, tipo: f.tipo, registroId: f.registro_id, en: f.creado, datos: registro ? paquete(registro) : null };
  });
}

export function marcarProcesados(perfilId: string, hasta: number) {
  const r = bd().prepare("UPDATE cola_ia SET procesado = ? WHERE perfil_id = ? AND id <= ? AND procesado IS NULL").run(ahora(), perfilId, hasta);
  return Number(r.changes);
}

export function estadoCola(perfilId: string) {
  const f = bd()
    .prepare(
      "SELECT COUNT(*) FILTER (WHERE procesado IS NULL) AS pendientes, COUNT(*) FILTER (WHERE procesado IS NOT NULL) AS procesados, MAX(creado) AS ultimo FROM cola_ia WHERE perfil_id = ?",
    )
    .get(perfilId) as { pendientes: number; procesados: number; ultimo: string | null };
  return { pendientes: Number(f.pendientes), procesados: Number(f.procesados), ultimo: f.ultimo };
}
