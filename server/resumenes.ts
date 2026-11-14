import {
  ESTADOS_SEGUIMIENTO,
  nombreInicio,
  nombreIntensidad,
  nombreZona,
  type DatosChequeo,
  type DatosMotora,
  type Registro,
} from "../compartido/catalogos.ts";
import { listar } from "./registros.ts";

// Resúmenes automáticos: se arman solo con lo que la persona registró o la app
// midió. No interpretan ni dan orientación de salud.

const seguimientoNombre = (id: string) => ESTADOS_SEGUIMIENTO.find((e) => e.id === id)?.nombre.toLowerCase() ?? id;

export function resumenChequeoAuto(d: Omit<DatosChequeo, "resumen">): string {
  const partes: string[] = [];
  partes.push(`Ánimo ${d.animo} de 5${d.animoTexto ? ` («${d.animoTexto}»)` : ""}.`);
  partes.push(d.suenoHoras === null ? "Sueño sin registrar." : `Dormiste ${d.suenoHoras} h.`);
  partes.push(`Estrés ${d.estres} de 5.`);
  for (const s of d.seguimiento) {
    partes.push(
      `${s.manifestacion} en ${nombreZona(s.zona).toLowerCase()}: ${seguimientoNombre(s.estado)}${
        s.intensidad && s.estado !== "resuelto" ? `, intensidad ${s.intensidad} de 5` : ""
      }.`,
    );
  }
  for (const n of d.nuevos) {
    partes.push(
      `Nuevo: ${n.manifestacion.toLowerCase()} en ${nombreZona(n.zona).toLowerCase()}, ${n.intensidad} de 5 (${nombreIntensidad(n.intensidad).toLowerCase()}), desde ${nombreInicio(n.inicio).toLowerCase()}.`,
    );
  }
  if (!d.seguimiento.length && !d.nuevos.length) partes.push("Sin síntomas nuevos ni pendientes.");
  if (d.notas) partes.push(`Notas: ${d.notas}`);
  return partes.join(" ");
}

export interface ComparacionMotora {
  pruebas: number;
  ultima: number | null;
  anterior: number | null;
  promedioPrevio: number | null;
  frenteAnterior: number | null;
  frentePromedio: number | null;
  texto: string;
}

/** Compara la última prueba con la anterior y con el promedio de hasta cinco previas. */
export function compararMotora(perfilId: string): ComparacionMotora {
  const pruebas = (listar(perfilId, { tipo: "motora" }) as Registro<DatosMotora>[]).sort((a, b) => b.creado.localeCompare(a.creado));
  const c: ComparacionMotora = { pruebas: pruebas.length, ultima: null, anterior: null, promedioPrevio: null, frenteAnterior: null, frentePromedio: null, texto: "" };
  if (!pruebas.length) {
    c.texto = "Todavía no hay pruebas. Haz la primera para tener un punto de comparación.";
    return c;
  }
  c.ultima = pruebas[0].datos.mediana;
  const previas = pruebas.slice(1, 6);
  if (!previas.length) {
    c.texto = `Mediana de ${c.ultima} ms. Es tu primera prueba: servirá de referencia para las siguientes.`;
    return c;
  }
  c.anterior = previas[0].datos.mediana;
  c.promedioPrevio = Math.round(previas.reduce((s, p) => s + p.datos.mediana, 0) / previas.length);
  c.frenteAnterior = c.ultima - c.anterior;
  c.frentePromedio = c.ultima - c.promedioPrevio;
  const frase = (dif: number) => (dif === 0 ? "igual" : `${Math.abs(dif)} ms ${dif < 0 ? "más rápida" : "más lenta"}`);
  c.texto = `Mediana de ${c.ultima} ms: ${frase(c.frenteAnterior)} que la prueba anterior (${c.anterior} ms) y ${frase(
    c.frentePromedio,
  )} que el promedio de tus ${previas.length} pruebas previas (${c.promedioPrevio} ms).`;
  return c;
}
