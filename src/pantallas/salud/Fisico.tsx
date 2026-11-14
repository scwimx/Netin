import { HelpCircle, ListTodo, Plus, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ESTADOS_SEGUIMIENTO,
  INICIOS,
  INTENSIDADES,
  MANIFESTACIONES,
  nombreEtapa,
  nombreInicio,
  nombreIntensidad,
  nombreZona,
  ZONAS,
  type DatosSintoma,
  type Registro,
  type ZonaId,
} from "@compartido/catalogos";
import { Estado, nivelIntensidad } from "@/componentes/Estado";
import { LeyendaMapa, MapaCorporal } from "@/componentes/MapaCorporal";
import { Panel, Vacio } from "@/componentes/Panel";
import { Button } from "@/componentes/ui/button";
import { Label } from "@/componentes/ui/label";
import { Textarea } from "@/componentes/ui/textarea";
import { useDatos } from "@/hooks/useDatos";
import { api } from "@/lib/api";
import { fechaCorta } from "@/lib/formato";
import { cn } from "@/lib/utils";

export function Fisico() {
  const [params, setParams] = useSearchParams();
  const { datos, recargar } = useDatos<Registro<DatosSintoma>[]>("/registros?tipo=sintoma");
  const zonaParam = params.get("zona") as ZonaId | null;
  const [zona, setZona] = useState<ZonaId | null>(zonaParam && ZONAS.some((z) => z.id === zonaParam) ? zonaParam : null);
  const [formulario, setFormulario] = useState(false);

  useEffect(() => {
    if (zona) setParams({ zona }, { replace: true });
  }, [zona, setParams]);

  const sintomas = datos ?? [];
  const intensidades = useMemo(() => {
    const m: Partial<Record<ZonaId, number>> = {};
    for (const s of sintomas) if (s.datos.estado === "activo") m[s.datos.zona] = Math.max(m[s.datos.zona] ?? 0, s.datos.intensidad);
    return m;
  }, [sintomas]);
  const enZona = sintomas.filter((s) => s.datos.zona === zona);
  const activos = sintomas.filter((s) => s.datos.estado === "activo");

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <Panel className="relative overflow-hidden">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Mapa corporal</h2>
          <span className="text-sm text-tinta-suave">{activos.length ? `${activos.length} síntoma${activos.length > 1 ? "s" : ""} activo${activos.length > 1 ? "s" : ""}` : "Sin síntomas activos"}</span>
        </div>
        <p className="mb-4 text-sm text-tinta-suave">Toca una zona para ver o registrar lo que sientes.</p>
        <MapaCorporal
          intensidades={intensidades}
          seleccionada={zona}
          alElegir={(z) => {
            setZona(z);
            setFormulario(false);
          }}
          escanear
          alto="h-[380px] sm:h-[440px]"
        />
        <div className="mt-4 border-t border-borde/60 pt-3">
          <LeyendaMapa />
        </div>
      </Panel>

      <div className="flex flex-col gap-5">
        <AnimatePresence mode="wait">
          {zona ? (
            <motion.div key={zona} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="flex flex-col gap-5">
              <Panel>
                <p className="text-sm text-tinta-suave">Zona elegida</p>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-2xl font-semibold">{nombreZona(zona)}</h2>
                  {intensidades[zona] ? (
                    <Estado nivel={nivelIntensidad(intensidades[zona]!)}>Activo · {nombreIntensidad(intensidades[zona]!)}</Estado>
                  ) : (
                    <Estado nivel="bien">Sin síntomas activos</Estado>
                  )}
                </div>

                {enZona.length > 0 && (
                  <ul className="mb-4 space-y-3">
                    {enZona.map((s) => (
                      <TarjetaSintoma key={s.id} sintoma={s} alCambiar={recargar} />
                    ))}
                  </ul>
                )}

                {formulario ? (
                  <FormSintoma
                    zona={zona}
                    alCancelar={() => setFormulario(false)}
                    alGuardar={async () => {
                      setFormulario(false);
                      await recargar();
                    }}
                  />
                ) : (
                  <Button className="w-full" onClick={() => setFormulario(true)}>
                    <Plus className="size-4" /> Registrar síntoma en esta zona
                  </Button>
                )}
              </Panel>

              <Explicaciones sintomas={enZona.filter((s) => s.datos.estado === "activo")} />
            </motion.div>
          ) : (
            <motion.div key="nada" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Panel titulo="Síntomas activos">
                {activos.length ? (
                  <ul className="space-y-2">
                    {activos.map((s) => (
                      <li key={s.id}>
                        <button onClick={() => setZona(s.datos.zona)} className="flex w-full items-center justify-between gap-2 rounded-lg bg-casco-alto/50 px-3 py-2.5 text-left hover:bg-casco-alto">
                          <span className="text-sm">
                            {s.datos.manifestacion} · {nombreZona(s.datos.zona)}
                          </span>
                          <Estado nivel={nivelIntensidad(s.datos.intensidad)}>{nombreIntensidad(s.datos.intensidad)}</Estado>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Vacio>Elige una zona en la figura para registrar un síntoma.</Vacio>
                )}
              </Panel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TarjetaSintoma({ sintoma: s, alCambiar }: { sintoma: Registro<DatosSintoma>; alCambiar: () => void }) {
  const [intensidad, setIntensidad] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const d = s.datos;

  const seguir = async (estado: string) => {
    setError(null);
    try {
      await api.post(`/sintomas/${s.id}/seguimiento`, { estado, ...(intensidad && estado !== "resuelto" ? { intensidad } : {}) });
      setIntensidad(null);
      alCambiar();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <li className={cn("rounded-xl p-3 ring-1 ring-inset", d.estado === "activo" ? "bg-casco-alto/60 ring-borde" : "bg-transparent ring-borde/50 opacity-70")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{d.manifestacion}</p>
        {d.estado === "activo" ? <Estado nivel={nivelIntensidad(d.intensidad)}>{`${d.intensidad} · ${nombreIntensidad(d.intensidad)}`}</Estado> : <Estado nivel="bien">Resuelto</Estado>}
      </div>
      <p className="mt-1 text-xs text-tinta-tenue">
        Registrado el {fechaCorta(s.fecha)} en {nombreEtapa(s.etapa)} · inicio: {nombreInicio(d.inicio).toLowerCase()}
        {d.seguimientos.length > 0 && ` · ${d.seguimientos.length} seguimiento${d.seguimientos.length > 1 ? "s" : ""}`}
      </p>
      {d.notas && <p className="mt-2 text-sm text-tinta-suave">«{d.notas}»</p>}
      {d.estado === "activo" && (
        <div className="mt-3 space-y-2 border-t border-borde/60 pt-3">
          <p className="text-xs text-tinta-suave">¿Cómo sigue hoy?</p>
          <div className="flex flex-wrap gap-1">
            {INTENSIDADES.map((i) => (
              <button
                key={i.valor}
                onClick={() => setIntensidad(intensidad === i.valor ? null : i.valor)}
                aria-pressed={intensidad === i.valor}
                className={cn("cifra size-8 rounded-md text-sm", intensidad === i.valor ? "bg-acento text-acento-tinta" : "bg-casco text-tinta-suave hover:text-tinta")}
                title={i.nombre}
              >
                {i.valor}
              </button>
            ))}
            <span className="self-center pl-1 text-xs text-tinta-tenue">intensidad (opcional)</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ESTADOS_SEGUIMIENTO.map((e) => (
              <Button key={e.id} size="sm" variant={e.id === "resuelto" ? "outline" : "secondary"} onClick={() => seguir(e.id)}>
                {e.nombre}
              </Button>
            ))}
          </div>
          {error && <p className="text-xs text-critico">{error}</p>}
        </div>
      )}
    </li>
  );
}

function FormSintoma({ zona, alCancelar, alGuardar }: { zona: ZonaId; alCancelar: () => void; alGuardar: () => void }) {
  const [manifestacion, setManifestacion] = useState<string>(MANIFESTACIONES[0]);
  const [intensidad, setIntensidad] = useState(2);
  const [inicio, setInicio] = useState<string>("hoy");
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      await api.post("/registros", { tipo: "sintoma", datos: { zona, manifestacion, intensidad, inicio, notas } });
      alGuardar();
    } catch (e) {
      setError((e as Error).message);
      setGuardando(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4 overflow-hidden">
      <div className="space-y-2">
        <Label htmlFor="manif">¿Qué sientes?</Label>
        <select id="manif" value={manifestacion} onChange={(e) => setManifestacion(e.target.value)} className="h-10 w-full rounded-md bg-casco-alto px-3 text-sm ring-1 ring-borde">
          {MANIFESTACIONES.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">¿Desde cuándo?</p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {INICIOS.map((i) => (
            <button
              key={i.id}
              onClick={() => setInicio(i.id)}
              aria-pressed={inicio === i.id}
              className={cn("rounded-lg px-2 py-2 text-sm", inicio === i.id ? "bg-acento text-acento-tinta" : "bg-casco-alto text-tinta-suave hover:text-tinta")}
            >
              {i.nombre}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <p className="text-sm font-medium">Intensidad</p>
          <span className="text-sm text-acento">
            {intensidad}: {nombreIntensidad(intensidad)}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {INTENSIDADES.map((i) => (
            <button
              key={i.valor}
              onClick={() => setIntensidad(i.valor)}
              aria-pressed={intensidad === i.valor}
              className={cn("rounded-lg py-2", intensidad === i.valor ? "bg-acento text-acento-tinta" : "bg-casco-alto text-tinta-suave hover:text-tinta")}
            >
              <span className="block font-display text-lg cifra">{i.valor}</span>
              <span className="block text-[11px]">{i.nombre}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notas-s">Detalles o contexto</Label>
        <Textarea id="notas-s" value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} maxLength={1000} placeholder="Ej.: al levantar el arnés del equipo de ejercicio" />
      </div>
      {error && <p className="text-sm text-critico">{error}</p>}
      <div className="flex gap-2">
        <Button className="flex-1" onClick={guardar} disabled={guardando}>
          Guardar síntoma
        </Button>
        <Button variant="ghost" onClick={alCancelar}>
          Cancelar
        </Button>
      </div>
    </motion.div>
  );
}

/**
 * Posibles explicaciones. Sin IA ni documentos no se proponen causas: se
 * muestra qué se sabe, qué datos faltan y qué hacer a continuación.
 */
function Explicaciones({ sintomas }: { sintomas: Registro<DatosSintoma>[] }) {
  if (!sintomas.length) return null;
  const hoy = new Date().toISOString().slice(0, 10);
  const faltan = new Set<string>();
  for (const s of sintomas) {
    if (!s.datos.notas) faltan.add("Qué estabas haciendo cuando empezó (contexto en las notas).");
    if (!s.datos.seguimientos.some((x) => x.fecha === hoy) && s.fecha !== hoy) faltan.add("Cómo sigue hoy (seguimiento).");
  }
  const severo = sintomas.some((s) => s.datos.intensidad >= 4 || s.datos.seguimientos.at(-1)?.estado === "peor");

  return (
    <Panel titulo="Posibles explicaciones">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-dashed border-borde p-3">
          <HelpCircle className="mt-0.5 size-4 shrink-0 text-tinta-tenue" aria-hidden />
          <div className="space-y-1">
            <Estado nivel="neutro">Pendiente de IA y documentos</Estado>
            <p className="text-sm text-tinta-suave">
              Netin no propone causas sin una fuente que las respalde. Cuando se integren el asistente y los documentos de la misión, aquí verás posibilidades con su respaldo.
            </p>
          </div>
        </div>
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Search className="size-4 text-acento" aria-hidden /> Datos que faltan
          </p>
          {faltan.size ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-tinta-suave">
              {[...faltan].map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-tinta-suave">Tu registro de esta zona está completo.</p>
          )}
        </div>
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium">
            <ListTodo className="size-4 text-acento" aria-hidden /> Siguientes pasos
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-tinta-suave">
            <li>Registra cómo sigue cada día para ver su evolución.</li>
            {severo ? (
              <li className="text-tinta">Lo marcaste como severo o dijiste que va peor: avisa al responsable médico de la misión.</li>
            ) : (
              <li>Si empeora o te preocupa, avisa al responsable médico de la misión.</li>
            )}
          </ul>
        </div>
      </div>
    </Panel>
  );
}
