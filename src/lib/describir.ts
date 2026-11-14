import { BookOpen, Camera, ClipboardCheck, HeartPulse, PersonStanding, Siren, Timer, type LucideIcon } from "lucide-react";
import { indicador, nombreIntensidad, nombreZona, type Registro, type TipoRegistro } from "@compartido/catalogos";

export const ICONO_TIPO: Record<TipoRegistro, LucideIcon> = {
  foto: Camera,
  chequeo: ClipboardCheck,
  sintoma: PersonStanding,
  motora: Timer,
  bitacora: BookOpen,
  vital: HeartPulse,
  aviso: Siren,
};

/** Título y detalle cortos de un registro para listas. */
export function describir(r: Registro): { titulo: string; detalle: string } {
  const d = r.datos;
  switch (r.tipo) {
    case "foto":
      return { titulo: d.omitida ? "Día sin foto" : "Foto diaria", detalle: d.omitida ? (d.motivo ?? "") : "" };
    case "chequeo":
      return { titulo: "Chequeo diario", detalle: d.resumen?.texto ?? "" };
    case "sintoma":
      return {
        titulo: `${d.manifestacion} · ${nombreZona(d.zona)}`,
        detalle: `${d.estado === "resuelto" ? "Resuelto" : `Intensidad ${d.intensidad} (${nombreIntensidad(d.intensidad).toLowerCase()})`}${d.notas ? ` · ${d.notas}` : ""}`,
      };
    case "motora":
      return { titulo: "Prueba de reacción visual", detalle: `Mediana ${d.mediana} ms · mejor ${d.mejor} ms · ${d.intentos.length} intentos` };
    case "bitacora":
      return { titulo: "Bitácora", detalle: d.entrada };
    case "vital": {
      const ind = indicador(d.indicador);
      return { titulo: ind?.nombre ?? d.indicador, detalle: `${d.valor2 !== undefined ? `${d.valor}/${d.valor2}` : d.valor} ${ind?.unidad ?? ""}` };
    }
    case "aviso":
      return { titulo: `${d.alcance === "simulacro" ? "Simulacro" : "Aviso local"}: ${d.titulo}`, detalle: `${d.estado === "abierto" ? "Abierto" : "Cerrado"}${d.detalle ? ` · ${d.detalle}` : ""}` };
  }
}
