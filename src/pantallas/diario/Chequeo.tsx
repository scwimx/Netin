import { CornerUpLeft, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ESTADOS_SEGUIMIENTO,
  INICIOS,
  INTENSIDADES,
  MANIFESTACIONES,
  nombreIntensidad,
  nombreZona,
  ZONAS,
  type DatosSintoma,
  type EstadoSeguimiento,
  type Registro,
  type ZonaId,
} from "@compartido/catalogos";
import { Origen } from "@/componentes/Estado";
import { FiguraCorporal } from "@/componentes/MapaCorporal";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { usePerfil } from "@/hooks/useSesion";
import { api } from "@/lib/api";
import { haceCuanto } from "@/lib/formato";
import { cn } from "@/lib/utils";

interface Nuevo {
  zona: ZonaId | null;
  manifestacion: string;
  intensidad: number;
  inicio: string;
  notas: string;
}
interface Respuestas {
  animo: number;
  animoTexto: string;
  suenoHoras: number | null;
  estres: number;
  seguimiento: { estado: EstadoSeguimiento | null; intensidad?: number }[];
  nuevos: Nuevo[];
  notas: string;
}
type Paso =
  | { id: "animo" | "animoTexto" | "sueno" | "estres" | "nuevo" | "nZona" | "nTipo" | "nInt" | "nInicio" | "nNotas" | "notas" | "resumen" }
  | { id: "seg" | "segInt"; i: number };

interface Turno {
  pregunta: string;
  respuesta: string;
}
interface Borrador {
  r: Respuestas;
  paso: Paso;
  turnos: Turno[];
  pila: { r: Respuestas; paso: Paso; turnos: Turno[] }[];
}

const ANIMOS = ["Muy mal", "Mal", "Regular", "Bien", "Muy bien"];
const ESTRES = ["Nada", "Poco", "Algo", "Bastante", "Mucho"];
const vacio = (n: number): Respuestas => ({ animo: 0, animoTexto: "", suenoHoras: null, estres: 0, seguimiento: Array.from({ length: n }, () => ({ estado: null })), nuevos: [], notas: "" });

/** Chequeo conversacional con preguntas fijas, una a la vez. */
export function Chequeo({ alTerminar }: { alTerminar: () => void }) {
  const perfil = usePerfil();
  const [pendientes, setPendientes] = useState<Registro<DatosSintoma>[] | null>(null);
  const [b, setB] = useState<Borrador | null>(null);
  const [resumen, setResumen] = useState<{ texto: string; original: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const fin = useRef<HTMLDivElement>(null);

  // Carga síntomas pendientes y reanuda el borrador si existe.
  useEffect(() => {
    void (async () => {
      const [pend, borr] = await Promise.all([
        api.get<Registro<DatosSintoma>[]>("/chequeo/pendientes"),
        api.get<{ datos: Borrador; actualizado: string } | null>("/borradores/chequeo"),
      ]);
      setPendientes(pend);
      const valido = borr?.datos && borr.datos.r.seguimiento.length === pend.length && new Date(borr.actualizado).toDateString() === new Date().toDateString();
      setB(valido ? borr.datos : { r: vacio(pend.length), paso: { id: "animo" }, turnos: [], pila: [] });
    })().catch((e) => setError((e as Error).message));
  }, []);

  // Guarda el borrador para poder reanudar.
  useEffect(() => {
    if (!b) return;
    const t = setTimeout(() => void api.put("/borradores/chequeo", { datos: b }).catch(() => {}), 400);
    fin.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    return () => clearTimeout(t);
  }, [b]);

  const nombre = perfil.ajustes.comoLlamarte || perfil.nombre.split(" ")[0];

  const pregunta = useMemo(() => {
    if (!b || !pendientes) return "";
    const p = b.paso;
    const actual = b.r.nuevos.at(-1);
    switch (p.id) {
      case "animo":
        return `Hola, ${nombre}. ¿Cómo te sientes hoy?`;
      case "animoTexto":
        return "¿Quieres contarme un poco más? Puedes saltarlo.";
      case "sueno":
        return "¿Cuántas horas dormiste?";
      case "estres":
        return "¿Cuánto estrés sientes ahora?";
      case "seg": {
        const s = pendientes[p.i];
        return `${haceCuanto(s.creado).replace(/^hace/, "Hace")} registraste ${s.datos.manifestacion.toLowerCase()} en ${nombreZona(s.datos.zona).toLowerCase()} (${nombreIntensidad(s.datos.intensidad).toLowerCase()}). ¿Cómo sigue?`;
      }
      case "segInt":
        return "¿Qué intensidad tiene ahora?";
      case "nuevo":
        return b.r.nuevos.length ? "¿Notaste algo más?" : "¿Notaste algo nuevo en tu cuerpo?";
      case "nZona":
        return "¿Dónde lo sientes?";
      case "nTipo":
        return `¿Cómo describirías lo que sientes en ${nombreZona(actual?.zona ?? "").toLowerCase()}?`;
      case "nInt":
        return "¿Qué tan intenso es?";
      case "nInicio":
        return "¿Desde cuándo lo notas?";
      case "nNotas":
        return "¿Algo que ayude a entenderlo? Por ejemplo, qué estabas haciendo. Puedes saltarlo.";
      case "notas":
        return "¿Algo más para el registro de hoy? Puedes saltarlo.";
      case "resumen":
        return "Este es el resumen. Puedes editarlo antes de guardar.";
    }
  }, [b, pendientes, nombre]);

  if (error) return <p className="text-critico">{error}</p>;
  if (!b || !pendientes) return <p className="text-tinta-suave">Preparando el chequeo…</p>;

  const siguiente = (p: Paso, r: Respuestas): Paso => {
    const tras = (i: number): Paso => (i + 1 < pendientes.length ? { id: "seg", i: i + 1 } : { id: "nuevo" });
    switch (p.id) {
      case "animo":
        return { id: "animoTexto" };
      case "animoTexto":
        return { id: "sueno" };
      case "sueno":
        return { id: "estres" };
      case "estres":
        return pendientes.length ? { id: "seg", i: 0 } : { id: "nuevo" };
      case "seg":
        return r.seguimiento[p.i].estado === "resuelto" ? tras(p.i) : { id: "segInt", i: p.i };
      case "segInt":
        return tras(p.i);
      case "nuevo":
        return r.nuevos.length && r.nuevos.at(-1)!.zona === null ? { id: "nZona" } : { id: "notas" };
      case "nZona":
        return { id: "nTipo" };
      case "nTipo":
        return { id: "nInt" };
      case "nInt":
        return { id: "nInicio" };
      case "nInicio":
        return { id: "nNotas" };
      case "nNotas":
        return { id: "nuevo" };
      case "notas":
        return { id: "resumen" };
      default:
        return p;
    }
  };

  const responder = (texto: string, cambio: (r: Respuestas) => Respuestas) => {
    const r = cambio(structuredClone(b.r));
    const paso = siguiente(b.paso, r);
    setB({ r, paso, turnos: [...b.turnos, { pregunta, respuesta: texto }], pila: [...b.pila, { r: b.r, paso: b.paso, turnos: b.turnos }] });
    if (paso.id === "resumen") void prepararResumen(r);
  };

  const volver = () => {
    const previo = b.pila.at(-1);
    if (!previo) return;
    setB({ ...previo, pila: b.pila.slice(0, -1) });
    setResumen(null);
  };

  const cuerpo = (r: Respuestas) => ({
    animo: r.animo,
    animoTexto: r.animoTexto,
    suenoHoras: r.suenoHoras,
    estres: r.estres,
    notas: r.notas,
    seguimiento: pendientes.map((s, i) => ({
      sintomaId: s.id,
      zona: s.datos.zona,
      manifestacion: s.datos.manifestacion,
      estado: r.seguimiento[i].estado,
      ...(r.seguimiento[i].intensidad ? { intensidad: r.seguimiento[i].intensidad } : {}),
    })),
    nuevos: r.nuevos.filter((n) => n.zona),
  });

  async function prepararResumen(r: Respuestas) {
    try {
      const res = await api.post<{ texto: string }>("/chequeo/resumen", cuerpo(r));
      setResumen({ texto: res.texto, original: res.texto });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const guardar = async () => {
    if (!resumen) return;
    setGuardando(true);
    try {
      await api.post("/chequeo", { ...cuerpo(b.r), resumen: { texto: resumen.texto, origen: "automatico", editado: resumen.texto !== resumen.original } });
      alTerminar();
    } catch (e) {
      setError((e as Error).message);
      setGuardando(false);
    }
  };

  const p = b.paso;
  const actual = b.r.nuevos.at(-1);
  const editarNuevo = (cambio: Partial<Nuevo>) => (r: Respuestas) => {
    Object.assign(r.nuevos[r.nuevos.length - 1], cambio);
    return r;
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <p className="flex items-center gap-2 text-xs text-tinta-tenue">
        <Sparkles className="size-3.5" aria-hidden /> Guía del chequeo: preguntas fijas, sin IA. Tus respuestas quedan listas para el asistente futuro.
      </p>

      <ol className="flex flex-col gap-3" aria-live="polite">
        {b.turnos.map((t, i) => (
          <li key={i} className="flex flex-col gap-2">
            <Burbuja de="guia">{t.pregunta}</Burbuja>
            <Burbuja de="yo">{t.respuesta}</Burbuja>
          </li>
        ))}
        <li>
          <AnimatePresence mode="wait">
            <motion.div key={b.turnos.length} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Burbuja de="guia">{pregunta}</Burbuja>
            </motion.div>
          </AnimatePresence>
        </li>
      </ol>

      <motion.div key={`r-${b.turnos.length}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="rounded-2xl bg-casco/80 p-4 ring-1 ring-borde">
        {p.id === "animo" && <Opciones valores={ANIMOS.map((t, i) => ({ v: i + 1, t }))} alElegir={(v, t) => responder(t, (r) => ({ ...r, animo: v }))} escala />}
        {p.id === "animoTexto" && <TextoLibre opcional alEnviar={(t) => responder(t || "Prefiero no agregar nada", (r) => ({ ...r, animoTexto: t }))} />}
        {p.id === "sueno" && <Horas alEnviar={(h) => responder(h === null ? "No lo sé" : `${h} h`, (r) => ({ ...r, suenoHoras: h }))} />}
        {p.id === "estres" && <Opciones valores={ESTRES.map((t, i) => ({ v: i + 1, t }))} alElegir={(v, t) => responder(t, (r) => ({ ...r, estres: v }))} escala />}
        {p.id === "seg" && (
          <Opciones
            valores={ESTADOS_SEGUIMIENTO.map((e, i) => ({ v: i, t: e.nombre }))}
            alElegir={(v, t) => responder(t, (r) => ((r.seguimiento[p.i] = { estado: ESTADOS_SEGUIMIENTO[v].id }), r))}
          />
        )}
        {p.id === "segInt" && (
          <Opciones
            valores={INTENSIDADES.map((x) => ({ v: x.valor, t: `${x.valor} · ${x.nombre}` }))}
            alElegir={(v, t) => responder(t, (r) => ((r.seguimiento[p.i].intensidad = v), r))}
            escala
          />
        )}
        {p.id === "nuevo" && (
          <Opciones
            valores={[
              { v: 1, t: "Sí" },
              { v: 0, t: "No" },
            ]}
            alElegir={(v, t) =>
              responder(t, (r) => {
                if (v) r.nuevos.push({ zona: null, manifestacion: "", intensidad: 0, inicio: "", notas: "" });
                return r;
              })
            }
          />
        )}
        {p.id === "nZona" && <ElegirZona alElegir={(z) => responder(nombreZona(z), editarNuevo({ zona: z }))} />}
        {p.id === "nTipo" && <Opciones valores={MANIFESTACIONES.map((m, i) => ({ v: i, t: m }))} alElegir={(_, t) => responder(t, editarNuevo({ manifestacion: t }))} />}
        {p.id === "nInt" && (
          <Opciones valores={INTENSIDADES.map((x) => ({ v: x.valor, t: `${x.valor} · ${x.nombre}` }))} alElegir={(v, t) => responder(t, editarNuevo({ intensidad: v }))} escala />
        )}
        {p.id === "nInicio" && <Opciones valores={INICIOS.map((x, i) => ({ v: i, t: x.nombre }))} alElegir={(v, t) => responder(t, editarNuevo({ inicio: INICIOS[v].id }))} />}
        {p.id === "nNotas" && <TextoLibre opcional alEnviar={(t) => responder(t || "Nada que agregar", editarNuevo({ notas: t }))} />}
        {p.id === "notas" && <TextoLibre opcional alEnviar={(t) => responder(t || "Nada más", (r) => ({ ...r, notas: t }))} />}
        {p.id === "resumen" &&
          (resumen ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Origen origen="automatico" />
                {resumen.texto !== resumen.original && <span className="text-xs text-tinta-suave">Editado por ti</span>}
              </div>
              <Textarea value={resumen.texto} onChange={(e) => setResumen({ ...resumen, texto: e.target.value })} rows={5} maxLength={2000} aria-label="Resumen del chequeo" />
              <Button className="w-full" onClick={guardar} disabled={guardando || !resumen.texto.trim()}>
                Guardar chequeo
              </Button>
            </div>
          ) : (
            <p className="text-sm text-tinta-suave">Armando el resumen…</p>
          ))}
        {actual && p.id.startsWith("n") && p.id !== "nuevo" && p.id !== "notas" && (
          <p className="mt-3 text-xs text-tinta-tenue">
            Síntoma nuevo: {[actual.zona && nombreZona(actual.zona), actual.manifestacion, actual.intensidad && `intensidad ${actual.intensidad}`].filter(Boolean).join(" · ") || "sin datos todavía"}
          </p>
        )}
      </motion.div>

      {b.pila.length > 0 && (
        <button onClick={volver} className="inline-flex items-center gap-1.5 self-start text-sm text-tinta-suave hover:text-tinta">
          <CornerUpLeft className="size-4" /> Cambiar mi última respuesta
        </button>
      )}
      <div ref={fin} />
    </div>
  );
}

function Burbuja({ de, children }: { de: "guia" | "yo"; children: React.ReactNode }) {
  return (
    <div className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px]", de === "guia" ? "self-start rounded-tl-sm bg-casco-alto/90" : "ml-auto self-end rounded-tr-sm bg-acento text-acento-tinta")}>
      {children}
    </div>
  );
}

function Opciones({ valores, alElegir, escala = false }: { valores: { v: number; t: string }[]; alElegir: (v: number, t: string) => void; escala?: boolean }) {
  return (
    <div className={cn("grid gap-2", escala ? "grid-cols-5" : "grid-cols-2 sm:grid-cols-4")}>
      {valores.map((o, i) => (
        <motion.button
          key={o.v}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => alElegir(o.v, o.t)}
          className="rounded-xl bg-casco-alto/70 px-2 py-3 text-sm font-medium ring-1 ring-inset ring-borde transition-colors hover:bg-acento-suave hover:ring-acento"
        >
          {escala ? (
            <>
              <span className="block font-display text-lg cifra">{o.v}</span>
              <span className="block text-xs text-tinta-suave">{o.t.includes(" · ") ? o.t.split(" · ")[1] : o.t}</span>
            </>
          ) : (
            o.t
          )}
        </motion.button>
      ))}
    </div>
  );
}

function TextoLibre({ alEnviar, opcional }: { alEnviar: (t: string) => void; opcional?: boolean }) {
  const [t, setT] = useState("");
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        alEnviar(t.trim());
      }}
    >
      <Input autoFocus value={t} onChange={(e) => setT(e.target.value)} maxLength={1000} placeholder="Escribe aquí" />
      <div className="flex gap-2">
        {opcional && (
          <Button type="button" variant="ghost" onClick={() => alEnviar("")}>
            Saltar
          </Button>
        )}
        <Button type="submit" disabled={!t.trim()}>
          Enviar
        </Button>
      </div>
    </form>
  );
}

function Horas({ alEnviar }: { alEnviar: (h: number | null) => void }) {
  const [h, setH] = useState(7);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <input type="range" min={0} max={14} step={0.5} value={h} onChange={(e) => setH(Number(e.target.value))} className="flex-1 accent-[var(--acento)]" aria-label="Horas de sueño" />
        <span className="w-20 text-right font-display text-2xl cifra">{h} h</span>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => alEnviar(null)}>
          No lo sé
        </Button>
        <Button onClick={() => alEnviar(h)}>Listo</Button>
      </div>
    </div>
  );
}

function ElegirZona({ alElegir }: { alElegir: (z: ZonaId) => void }) {
  const [elegida, setElegida] = useState<ZonaId | null>(null);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {(["frontal", "posterior"] as const).map((v) => (
          <div key={v} className="h-64">
            <FiguraCorporal vista={v} intensidades={{}} seleccionada={elegida} alElegir={setElegida} />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          className="h-9 flex-1 rounded-md bg-casco-alto px-3 text-sm ring-1 ring-borde"
          value={elegida ?? ""}
          onChange={(e) => setElegida((e.target.value || null) as ZonaId | null)}
          aria-label="Zona del cuerpo"
        >
          <option value="">Elige en la figura o aquí</option>
          {ZONAS.map((z) => (
            <option key={z.id} value={z.id}>
              {z.nombre}
            </option>
          ))}
        </select>
        <Button disabled={!elegida} onClick={() => elegida && alElegir(elegida)}>
          {elegida ? `Es en ${nombreZona(elegida).toLowerCase()}` : "Elige una zona"}
        </Button>
      </div>
    </div>
  );
}
