// Catálogos y tipos que comparten la interfaz y el backend.
// Aquí no hay contenido médico: solo nombres, unidades y límites de captura
// (los límites evitan errores de dedo, no son umbrales clínicos).

export const ETAPAS = [
  { id: "tierra", nombre: "Tierra" },
  { id: "orbita", nombre: "Órbita" },
  { id: "transito", nombre: "Tránsito espacial" },
  { id: "marte", nombre: "Marte" },
] as const;
export type EtapaId = (typeof ETAPAS)[number]["id"];
export const nombreEtapa = (id: string) => ETAPAS.find((e) => e.id === id)?.nombre ?? id;

export type Vista = "frontal" | "posterior";

export const ZONAS = [
  { id: "cabeza", nombre: "Cabeza", vistas: ["frontal", "posterior"] },
  { id: "cuello", nombre: "Cuello", vistas: ["frontal", "posterior"] },
  { id: "hombro_izq", nombre: "Hombro izquierdo", vistas: ["frontal", "posterior"] },
  { id: "hombro_der", nombre: "Hombro derecho", vistas: ["frontal", "posterior"] },
  { id: "pecho", nombre: "Pecho", vistas: ["frontal"] },
  { id: "abdomen", nombre: "Abdomen", vistas: ["frontal"] },
  { id: "espalda_alta", nombre: "Espalda alta", vistas: ["posterior"] },
  { id: "espalda_baja", nombre: "Espalda baja", vistas: ["posterior"] },
  { id: "cadera", nombre: "Cadera", vistas: ["frontal", "posterior"] },
  { id: "brazo_izq", nombre: "Brazo izquierdo", vistas: ["frontal", "posterior"] },
  { id: "brazo_der", nombre: "Brazo derecho", vistas: ["frontal", "posterior"] },
  { id: "antebrazo_izq", nombre: "Antebrazo izquierdo", vistas: ["frontal", "posterior"] },
  { id: "antebrazo_der", nombre: "Antebrazo derecho", vistas: ["frontal", "posterior"] },
  { id: "mano_izq", nombre: "Mano izquierda", vistas: ["frontal", "posterior"] },
  { id: "mano_der", nombre: "Mano derecha", vistas: ["frontal", "posterior"] },
  { id: "muslo_izq", nombre: "Muslo izquierdo", vistas: ["frontal", "posterior"] },
  { id: "muslo_der", nombre: "Muslo derecho", vistas: ["frontal", "posterior"] },
  { id: "rodilla_izq", nombre: "Rodilla izquierda", vistas: ["frontal", "posterior"] },
  { id: "rodilla_der", nombre: "Rodilla derecha", vistas: ["frontal", "posterior"] },
  { id: "pierna_izq", nombre: "Pierna izquierda", vistas: ["frontal", "posterior"] },
  { id: "pierna_der", nombre: "Pierna derecha", vistas: ["frontal", "posterior"] },
  { id: "pie_izq", nombre: "Pie izquierdo", vistas: ["frontal", "posterior"] },
  { id: "pie_der", nombre: "Pie derecho", vistas: ["frontal", "posterior"] },
] as const;
export type ZonaId = (typeof ZONAS)[number]["id"];
export const nombreZona = (id: string) => ZONAS.find((z) => z.id === id)?.nombre ?? id;

export const MANIFESTACIONES = [
  "Dolor",
  "Tensión muscular",
  "Rigidez",
  "Hormigueo",
  "Hinchazón",
  "Debilidad",
  "Picazón o irritación",
  "Otro",
] as const;

export const INTENSIDADES = [
  { valor: 1, nombre: "Leve" },
  { valor: 2, nombre: "Molesto" },
  { valor: 3, nombre: "Moderado" },
  { valor: 4, nombre: "Severo" },
  { valor: 5, nombre: "Incapacitante" },
] as const;
export const nombreIntensidad = (n: number) =>
  INTENSIDADES.find((i) => i.valor === n)?.nombre ?? String(n);

export const INICIOS = [
  { id: "hoy", nombre: "Hoy" },
  { id: "ayer", nombre: "Ayer" },
  { id: "dias", nombre: "Hace 2 o 3 días" },
  { id: "mas", nombre: "Más de 3 días" },
] as const;
export const nombreInicio = (id: string) => INICIOS.find((i) => i.id === id)?.nombre ?? id;

export const ESTADOS_SEGUIMIENTO = [
  { id: "mejor", nombre: "Mejor" },
  { id: "igual", nombre: "Igual" },
  { id: "peor", nombre: "Peor" },
  { id: "resuelto", nombre: "Ya no lo tengo" },
] as const;
export type EstadoSeguimiento = (typeof ESTADOS_SEGUIMIENTO)[number]["id"];

export const INDICADORES = [
  { id: "fc", nombre: "Frecuencia cardíaca", unidad: "lpm", min: 20, max: 250, dos: false },
  { id: "pa", nombre: "Presión arterial", unidad: "mmHg", min: 30, max: 300, dos: true },
  { id: "spo2", nombre: "Oxígeno en sangre", unidad: "%", min: 50, max: 100, dos: false },
  { id: "temp", nombre: "Temperatura", unidad: "°C", min: 30, max: 45, dos: false },
  { id: "sueno", nombre: "Sueño", unidad: "h", min: 0, max: 24, dos: false },
  { id: "peso", nombre: "Peso", unidad: "kg", min: 20, max: 300, dos: false },
] as const;
export type IndicadorId = (typeof INDICADORES)[number]["id"];
export const indicador = (id: string) => INDICADORES.find((i) => i.id === id);

export const ORIGENES_MEDICION = [
  { id: "manual", nombre: "Manual" },
  { id: "simulada", nombre: "Simulada" },
  { id: "importada", nombre: "Importada" },
] as const;
export type OrigenMedicion = (typeof ORIGENES_MEDICION)[number]["id"];

export const TIPOS_REGISTRO = [
  { id: "foto", nombre: "Foto diaria" },
  { id: "chequeo", nombre: "Chequeo" },
  { id: "sintoma", nombre: "Síntoma" },
  { id: "motora", nombre: "Prueba motora" },
  { id: "bitacora", nombre: "Bitácora" },
  { id: "vital", nombre: "Medición" },
  { id: "aviso", nombre: "Aviso" },
] as const;
export type TipoRegistro = (typeof TIPOS_REGISTRO)[number]["id"];
export const nombreTipo = (id: string) => TIPOS_REGISTRO.find((t) => t.id === id)?.nombre ?? id;

/** De dónde sale un texto de resumen. Hoy solo «automatico»; «ia» queda reservado. */
export type OrigenResumen = "ia" | "automatico" | "simulado";
export interface Resumen {
  texto: string;
  origen: OrigenResumen;
  editado?: boolean;
}

export interface DatosFoto {
  archivo?: string;
  omitida: boolean;
  motivo?: string;
}
export interface SeguimientoSintoma {
  fecha: string;
  estado: EstadoSeguimiento;
  intensidad?: number;
  nota?: string;
}
export interface DatosSintoma {
  zona: ZonaId;
  manifestacion: string;
  intensidad: number;
  inicio: string;
  notas: string;
  estado: "activo" | "resuelto";
  seguimientos: SeguimientoSintoma[];
}
export interface DatosChequeo {
  animo: number;
  animoTexto: string;
  suenoHoras: number | null;
  estres: number;
  seguimiento: { sintomaId: string; zona: string; manifestacion: string; estado: EstadoSeguimiento; intensidad?: number }[];
  nuevos: { zona: ZonaId; manifestacion: string; intensidad: number; inicio: string; notas: string }[];
  notas: string;
  resumen: Resumen;
}
export interface DatosMotora {
  prueba: "reaccion_visual";
  intentos: number[];
  mediana: number;
  media: number;
  mejor: number;
  anticipos: number;
  resumen?: Resumen;
}
export interface DatosBitacora {
  entrada: string;
  resumen: Resumen | null;
}
export interface DatosVital {
  indicador: IndicadorId;
  valor: number;
  valor2?: number;
  origen: OrigenMedicion;
  medidoEn: string;
}
export interface DatosAviso {
  titulo: string;
  detalle: string;
  alcance: "local" | "simulacro";
  estado: "abierto" | "cerrado";
}

export interface Registro<D = any> {
  id: string;
  tipo: TipoRegistro;
  fecha: string;
  creado: string;
  actualizado: string;
  etapa: EtapaId;
  datos: D;
  revisiones: number;
}

export interface Perfil {
  id: string;
  nombre: string;
  rol: string;
  nacimiento: string | null;
  etapa: EtapaId;
  demo: boolean;
  archivado: boolean;
  creado: string;
  ajustes: AjustesPerfil;
}
export interface AjustesPerfil {
  camaraActiva: boolean;
  camaraId: string | null;
  respuestasBreves: boolean;
  comoLlamarte: string;
}
export const AJUSTES_POR_DEFECTO: AjustesPerfil = {
  camaraActiva: true,
  camaraId: null,
  respuestasBreves: true,
  comoLlamarte: "",
};

export interface EstadoDia {
  fecha: string;
  foto: "pendiente" | "hecha" | "omitida";
  chequeo: boolean;
  motora: boolean;
  bitacora: boolean;
  siguiente: "foto" | "chequeo" | "motora" | "bitacora" | null;
}

