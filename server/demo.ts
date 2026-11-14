// Crea un perfil con datos ficticios para la demostración: npm run demo:datos
// Todo lo generado es inventado y queda marcado como demo / simulado.
import type { DatosChequeo, DatosMotora, DatosSintoma, DatosVital, EtapaId } from "../compartido/catalogos.ts";
import { dirDatos } from "./config.ts";
import { abrir, bd, cerrar } from "./db.ts";
import * as perfiles from "./perfiles.ts";
import { insertar } from "./registros.ts";
import { resumenChequeoAuto } from "./resumenes.ts";

const NOMBRE = "Astra Demo";
const CLAVE = "demo-netin";

abrir();
const existente = bd().prepare("SELECT id FROM perfiles WHERE nombre = ? AND demo = 1").get(NOMBRE) as { id: string } | undefined;
if (existente) {
  bd().prepare("DELETE FROM perfiles WHERE id = ?").run(existente.id);
  console.log("Se reemplazó el perfil de demostración anterior.");
}

const perfil = perfiles.crear({ nombre: NOMBRE, rol: "Especialista de misión", clave: CLAVE, etapa: "orbita", demo: true });
perfiles.actualizar(perfil.id, { nacimiento: "1990-04-12" });

let semilla = 7;
const azar = () => ((semilla = (semilla * 9301 + 49297) % 233280) / 233280);
const entre = (a: number, b: number, dec = 0) => Number((a + azar() * (b - a)).toFixed(dec));

const DIAS = 14;
const fechaDe = (hace: number) => {
  const d = new Date();
  d.setDate(d.getDate() - hace);
  const p = (n: number) => String(n).padStart(2, "0");
  return { fecha: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, d };
};
const iso = (d: Date, h: number, m = 0) => {
  const x = new Date(d);
  x.setHours(h, m, 0, 0);
  return x.toISOString();
};

const BITACORAS = [
  "Primer día completo a bordo. Todo se siente nuevo; cuesta dormir con el zumbido de los ventiladores.",
  "Sesión de ejercicio resistivo larga. Terminé cansada pero contenta.",
  "Vimos una tormenta sobre el Pacífico desde la cúpula. Me quedé mirando un buen rato.",
  "Día tranquilo de experimentos. Llamada con mi familia por la tarde.",
  "Me desperté varias veces. Hoy me costó concentrarme en la mañana.",
  "Mejor descanso. El hombro molesta menos.",
  "Mucho trabajo de mantenimiento. Me siento con energía.",
];

let sintomaId: string | null = null;
for (let hace = DIAS; hace >= 1; hace--) {
  const { fecha, d } = fechaDe(hace);
  const etapa: EtapaId = hace > 11 ? "tierra" : "orbita";

  insertar(perfil.id, "foto", { omitida: true, motivo: "Perfil de demostración: sin fotos reales" }, etapa, { fecha, creado: iso(d, 7, 5) });

  // Síntoma ficticio que aparece y se va resolviendo
  const seguimiento: DatosChequeo["seguimiento"] = [];
  const nuevos: DatosChequeo["nuevos"] = [];
  if (hace === 9) {
    nuevos.push({ zona: "hombro_der", manifestacion: "Tensión muscular", intensidad: 3, inicio: "hoy", notas: "Después de la sesión de ejercicio resistivo" });
  } else if (sintomaId && hace < 9) {
    const estado = hace >= 6 ? "igual" : hace >= 3 ? "mejor" : "mejor";
    seguimiento.push({ sintomaId, zona: "hombro_der", manifestacion: "Tensión muscular", estado, intensidad: hace >= 6 ? 3 : 2 });
  }

  const sueno = entre(5.5, 7.8, 1);
  const base = {
    animo: Math.min(5, Math.max(1, Math.round(entre(2.6, 4.6)))),
    animoTexto: hace % 4 === 0 ? ["Algo cansada", "Con buen ánimo", "Un poco extrañando casa"][hace % 3] : "",
    suenoHoras: sueno,
    estres: Math.min(5, Math.max(1, Math.round(entre(1.5, 3.6)))),
    seguimiento,
    nuevos,
    notas: "",
  };
  const chequeo: DatosChequeo = { ...base, resumen: { texto: resumenChequeoAuto(base), origen: "automatico" } };

  for (const s of seguimiento) {
    const fila = bd().prepare("SELECT datos FROM registros WHERE id = ?").get(s.sintomaId) as { datos: string };
    const datos = JSON.parse(fila.datos) as DatosSintoma;
    datos.seguimientos.push({ fecha, estado: s.estado, intensidad: s.intensidad });
    datos.intensidad = s.intensidad ?? datos.intensidad;
    bd().prepare("UPDATE registros SET datos = ?, actualizado = ? WHERE id = ?").run(JSON.stringify(datos), iso(d, 7, 20), s.sintomaId);
  }
  for (const n of nuevos) {
    sintomaId = insertar(perfil.id, "sintoma", { ...n, estado: "activo", seguimientos: [] } satisfies DatosSintoma, etapa, { fecha, creado: iso(d, 7, 18) }).id;
  }
  insertar(perfil.id, "chequeo", chequeo, etapa, { fecha, creado: iso(d, 7, 20) });
  insertar(perfil.id, "vital", { indicador: "sueno", valor: sueno, origen: "manual", medidoEn: iso(d, 7, 20) } satisfies DatosVital, etapa, { fecha, creado: iso(d, 7, 20) });

  // Prueba motora simulada
  const intentos = Array.from({ length: 5 }, () => Math.round(entre(255, 340) + (hace > 10 ? 0 : 12)));
  const orden = [...intentos].sort((a, b) => a - b);
  const motora: DatosMotora = {
    prueba: "reaccion_visual",
    intentos,
    mediana: orden[2],
    media: Math.round(intentos.reduce((a, b) => a + b, 0) / 5),
    mejor: orden[0],
    anticipos: azar() > 0.8 ? 1 : 0,
  };
  insertar(perfil.id, "motora", motora, etapa, { fecha, creado: iso(d, 7, 30) });

  insertar(perfil.id, "bitacora", { entrada: BITACORAS[hace % BITACORAS.length], resumen: null }, etapa, { fecha, creado: iso(d, 21, 10) });

  // Vitales simulados
  const vitales: DatosVital[] = [
    { indicador: "fc", valor: Math.round(entre(58, 76)), origen: "simulada", medidoEn: iso(d, 7, 40) },
    { indicador: "pa", valor: Math.round(entre(108, 122)), valor2: Math.round(entre(68, 79)), origen: "simulada", medidoEn: iso(d, 7, 41) },
    { indicador: "spo2", valor: Math.round(entre(96, 99)), origen: "simulada", medidoEn: iso(d, 7, 42) },
    { indicador: "temp", valor: entre(36.3, 36.9, 1), origen: "simulada", medidoEn: iso(d, 7, 43) },
  ];
  if (hace % 3 === 0) vitales.push({ indicador: "peso", valor: entre(68.5, 70.2, 1), origen: "importada", medidoEn: iso(d, 6, 50) });
  for (const v of vitales) insertar(perfil.id, "vital", v, etapa, { fecha, creado: v.medidoEn });
}

// Un simulacro cerrado para mostrar cómo se ve un aviso
const { fecha: fSim, d: dSim } = fechaDe(5);
insertar(perfil.id, "aviso", { titulo: "Simulacro de despresurización", detalle: "Práctica programada con la tripulación.", alcance: "simulacro", estado: "cerrado" }, "orbita", { fecha: fSim, creado: iso(dSim, 15) });

// La cola para la IA empieza vacía en la demo: estos datos son ficticios.
bd().prepare("UPDATE cola_ia SET procesado = ? WHERE perfil_id = ?").run(new Date().toISOString(), perfil.id);

console.log(`Perfil de demostración listo en ${dirDatos()}`);
console.log(`Nombre: ${NOMBRE}  ·  Contraseña: ${CLAVE}`);
console.log("Hoy queda pendiente el registro diario, para probar el flujo completo.");
cerrar();
