import { BookOpen, Camera, Check, ClipboardCheck, Timer } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import type { EstadoDia } from "@compartido/catalogos";
import { Camara } from "@/componentes/Camara";
import { Origen } from "@/componentes/Estado";
import { Horizonte } from "@/componentes/Horizonte";
import { PruebaReaccion, type ResultadoReaccion } from "@/componentes/PruebaReaccion";
import { Button } from "@/componentes/ui/button";
import { Textarea } from "@/componentes/ui/textarea";
import { usePerfil, useSesion } from "@/hooks/useSesion";
import { api } from "@/lib/api";
import { fechaLarga } from "@/lib/formato";
import { cn } from "@/lib/utils";
import { Chequeo } from "./Chequeo";

type PasoId = "foto" | "chequeo" | "motora" | "bitacora";
const PASOS: { id: PasoId; texto: string; icono: typeof Camera }[] = [
  { id: "foto", texto: "Foto", icono: Camera },
  { id: "chequeo", texto: "Chequeo", icono: ClipboardCheck },
  { id: "motora", texto: "Prueba motora", icono: Timer },
  { id: "bitacora", texto: "Bitácora", icono: BookOpen },
];

const hecho = (d: EstadoDia, p: PasoId) => (p === "foto" ? d.foto !== "pendiente" : d[p]);

/**
 * Registro diario: foto y luego tres pasos cortos. Si la persona sale a
 * medias, la próxima vez continúa donde se quedó.
 */
export function FlujoDiario({ alSalir }: { alSalir: () => void }) {
  const perfil = usePerfil();
  const { dia, refrescarDia } = useSesion();
  const [paso, setPaso] = useState<PasoId | "fin" | null>(dia?.siguiente ?? "fin");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (paso === null && dia) setPaso(dia.siguiente ?? "fin");
  }, [dia, paso]);

  const avanzar = async () => {
    const d = await refrescarDia();
    setPaso(d?.siguiente ?? "fin");
  };

  const guardarFoto = async (cuerpo: object) => {
    setGuardando(true);
    setError(null);
    try {
      await api.post("/foto", cuerpo);
      await avanzar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  if (!dia || !paso) return null;

  return (
    <div className="relative min-h-dvh px-4 py-6 sm:py-10">
      <Horizonte etapa={perfil.etapa} />
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-tinta-suave">{fechaLarga(dia.fecha)}</p>
            <h1 className="text-2xl font-semibold sm:text-3xl">Registro del día</h1>
          </div>
          {paso !== "foto" && paso !== "fin" && (
            <Button variant="ghost" onClick={alSalir}>
              Seguir después
            </Button>
          )}
        </header>

        <ol className="mb-8 grid grid-cols-4 gap-2" aria-label="Pasos del registro diario">
          {PASOS.map((p) => {
            const listo = hecho(dia, p.id);
            const actual = paso === p.id;
            return (
              <li key={p.id} className="flex flex-col gap-2" aria-current={actual ? "step" : undefined}>
                <span className={cn("h-1 rounded-full transition-colors duration-500", listo ? "bg-acento" : actual ? "bg-acento/50" : "bg-casco-alto")} />
                <span className={cn("flex items-center gap-1.5 text-xs sm:text-sm", actual ? "text-tinta" : "text-tinta-tenue")}>
                  {listo ? <Check className="size-3.5 text-acento" aria-hidden /> : <p.icono className="size-3.5" aria-hidden />}
                  <span className="truncate">{p.texto}</span>
                  {listo && <span className="sr-only">(hecho)</span>}
                </span>
              </li>
            );
          })}
        </ol>

        {error && (
          <p className="mb-4 text-sm text-critico" role="alert">
            {error}
          </p>
        )}

        <AnimatePresence mode="wait">
          <motion.section key={paso} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }}>
            {paso === "foto" && (
              <>
                <h2 className="mb-1 text-xl font-semibold">Tu foto de hoy</h2>
                <p className="mb-5 text-tinta-suave">Una foto al día ayuda a notar cambios con el tiempo. Mira a la cámara con luz de frente.</p>
                <Camara
                  camaraId={perfil.ajustes.camaraId}
                  activa={perfil.ajustes.camaraActiva}
                  guardando={guardando}
                  alGuardar={(imagen) => guardarFoto({ imagen })}
                  alOmitir={(motivo) => guardarFoto({ omitida: true, motivo })}
                />
              </>
            )}
            {paso === "chequeo" && <Chequeo alTerminar={avanzar} />}
            {paso === "motora" && <PasoMotora alTerminar={avanzar} />}
            {paso === "bitacora" && <PasoBitacora alTerminar={avanzar} />}
            {paso === "fin" && (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <motion.span
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="flex size-16 items-center justify-center rounded-full bg-acento text-acento-tinta"
                >
                  <Check className="size-8" />
                </motion.span>
                <h2 className="text-2xl font-semibold">Registro del día completo</h2>
                <p className="max-w-sm text-tinta-suave">Todo quedó guardado. Puedes revisarlo o corregirlo en Registros.</p>
                <Button onClick={alSalir}>Ir a Inicio</Button>
              </div>
            )}
          </motion.section>
        </AnimatePresence>
      </div>
    </div>
  );
}

function PasoMotora({ alTerminar }: { alTerminar: () => void }) {
  const [comparacion, setComparacion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const guardar = async (r: ResultadoReaccion) => {
    try {
      await api.post("/registros", { tipo: "motora", datos: { prueba: "reaccion_visual", ...r } });
      setComparacion((await api.get<{ texto: string }>("/motora/comparacion")).texto);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold">Prueba de reacción</h2>
      <p className="mb-6 text-tinta-suave">Mide qué tan rápido respondes a una señal visual. Cinco intentos, menos de un minuto.</p>
      {error && <p className="mb-4 text-sm text-critico">{error}</p>}
      {comparacion ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 rounded-2xl bg-casco/80 p-5 ring-1 ring-borde">
          <Origen origen="automatico" />
          <p className="text-lg">{comparacion}</p>
          <p className="text-sm text-tinta-suave">Es una comparación de tus propios resultados, no una evaluación médica.</p>
          <Button onClick={alTerminar}>Continuar</Button>
        </motion.div>
      ) : (
        <PruebaReaccion alTerminar={guardar} />
      )}
    </div>
  );
}

function PasoBitacora({ alTerminar }: { alTerminar: () => void }) {
  const [texto, setTexto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Borrador local para no perder lo escrito.
  useEffect(() => {
    void api.get<{ datos: string } | null>("/borradores/bitacora").then((b) => b?.datos && setTexto(b.datos));
  }, []);
  useEffect(() => {
    const t = setTimeout(() => void api.put("/borradores/bitacora", { datos: texto }).catch(() => {}), 600);
    return () => clearTimeout(t);
  }, [texto]);

  const guardar = async () => {
    setGuardando(true);
    try {
      await api.post("/registros", { tipo: "bitacora", datos: { entrada: texto } });
      await api.del("/borradores/bitacora");
      alTerminar();
    } catch (e) {
      setError((e as Error).message);
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="mb-1 text-xl font-semibold">Bitácora</h2>
        <p className="text-tinta-suave">Escribe lo que quieras sobre tu día. Se guarda tal cual lo escribas.</p>
      </div>
      <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={9} maxLength={8000} autoFocus placeholder="Hoy…" className="text-base leading-relaxed" />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-tinta-tenue cifra">{texto.length} / 8000</span>
        <Button onClick={guardar} disabled={!texto.trim() || guardando}>
          Guardar bitácora
        </Button>
      </div>
      {error && <p className="text-sm text-critico">{error}</p>}
      <p className="text-xs text-tinta-tenue">El resumen del asistente aparecerá aparte cuando la IA esté integrada. Tu texto original no se modifica.</p>
    </div>
  );
}
