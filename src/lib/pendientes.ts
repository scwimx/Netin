import {
  nombreIntensidad,
  nombreZona,
  type DatosAviso,
  type DatosSintoma,
  type EstadoDia,
  type Registro,
} from "@compartido/catalogos";
import type { Nivel } from "@/componentes/Estado";
import { fechaCorta } from "@/lib/formato";

export interface Pendiente {
  id: string;
  nivel: Nivel;
  titulo: string;
  respaldo: string;
  accion?: { texto: string; a: string };
}

const diasDesde = (fecha: string) => Math.floor((Date.now() - new Date(fecha + "T12:00:00").getTime()) / 864e5);

/**
 * Riesgos y pendientes que salen directamente de los registros. No aplica
 * criterios clínicos: solo resalta lo que la persona marcó como severo, lo que
 * empeoró, lo que lleva días sin seguimiento y los avisos abiertos.
 */
export function calcularPendientes(registros: Registro[], dia: EstadoDia | null): Pendiente[] {
  const lista: Pendiente[] = [];

  for (const r of registros.filter((x) => x.tipo === "aviso") as Registro<DatosAviso>[]) {
    if (r.datos.estado !== "abierto") continue;
    lista.push({
      id: r.id,
      nivel: r.datos.alcance === "simulacro" ? "neutro" : "critico",
      titulo: `${r.datos.alcance === "simulacro" ? "Simulacro abierto" : "Aviso local abierto"}: ${r.datos.titulo}`,
      respaldo: `Registrado el ${fechaCorta(r.fecha)}`,
      accion: { texto: "Ver en Registros", a: "/registros?tipo=aviso" },
    });
  }

  for (const r of registros.filter((x) => x.tipo === "sintoma") as Registro<DatosSintoma>[]) {
    if (r.datos.estado !== "activo") continue;
    const s = r.datos;
    const ultimo = s.seguimientos.at(-1);
    const nombre = `${s.manifestacion} en ${nombreZona(s.zona).toLowerCase()}`;
    if (s.intensidad >= 4) {
      lista.push({
        id: r.id + "-sev",
        nivel: "critico",
        titulo: `${nombre}: lo marcaste como ${nombreIntensidad(s.intensidad).toLowerCase()}`,
        respaldo: `Síntoma registrado el ${fechaCorta(r.fecha)}${ultimo ? `, último seguimiento el ${fechaCorta(ultimo.fecha)}` : ""}. Si no mejora, avisa al responsable médico de la misión.`,
        accion: { texto: "Ver en el mapa", a: `/salud/fisico?zona=${s.zona}` },
      });
    } else if (ultimo?.estado === "peor") {
      lista.push({
        id: r.id + "-peor",
        nivel: "serio",
        titulo: `${nombre}: dijiste que va peor`,
        respaldo: `Seguimiento del ${fechaCorta(ultimo.fecha)}`,
        accion: { texto: "Ver en el mapa", a: `/salud/fisico?zona=${s.zona}` },
      });
    }
    const desde = diasDesde(ultimo?.fecha ?? r.fecha);
    if (desde >= 2) {
      lista.push({
        id: r.id + "-seg",
        nivel: "aviso",
        titulo: `${nombre}: ${desde} días sin seguimiento`,
        respaldo: `Último dato el ${fechaCorta(ultimo?.fecha ?? r.fecha)}`,
        accion: { texto: "Actualizar", a: `/salud/fisico?zona=${s.zona}` },
      });
    }
  }

  if (dia?.siguiente) {
    const textos = { foto: "la foto", chequeo: "el chequeo", motora: "la prueba motora", bitacora: "la bitácora" };
    lista.push({
      id: "dia",
      nivel: "info",
      titulo: `Falta ${textos[dia.siguiente]} de hoy`,
      respaldo: "Registro diario",
      accion: { texto: "Continuar", a: "/registro-diario" },
    });
  }

  const orden: Record<Nivel, number> = { critico: 0, serio: 1, aviso: 2, info: 3, neutro: 4, bien: 5 };
  return lista.sort((a, b) => orden[a.nivel] - orden[b.nivel]);
}
