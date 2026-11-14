import { Bot, Database, SendHorizonal } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { nombreEtapa } from "@compartido/catalogos";
import { Estado } from "@/componentes/Estado";
import { Encabezado, Panel } from "@/componentes/Panel";
import { Button } from "@/componentes/ui/button";
import { Textarea } from "@/componentes/ui/textarea";
import { useDatos } from "@/hooks/useDatos";
import { api } from "@/lib/api";
import { fechaHora } from "@/lib/formato";
import { cn } from "@/lib/utils";

interface Mensaje {
  id: string;
  autor: "usuario" | "asistente";
  texto: string;
  meta: { etapa?: string; fecha?: string };
  creado: string;
}

const SUGERENCIAS = ["Hoy me siento más cansado que ayer", "Me duele la espalda al despertar", "Me cuesta dormir con el ruido de la nave", "¿Qué debo medir hoy?"];

/**
 * La IA todavía no está conectada. La conversación se guarda por perfil y
 * queda en la cola de datos para el asistente futuro. No se generan
 * respuestas falsas.
 */
export function Asistente() {
  const { datos: mensajes, setDatos } = useDatos<Mensaje[]>("/mensajes");
  const { datos: cola, recargar: recargarCola } = useDatos<{ pendientes: number; procesados: number }>("/ia/estado");
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fin = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes?.length]);

  const enviar = async (e?: FormEvent, t = texto) => {
    e?.preventDefault();
    if (!t.trim()) return;
    setError(null);
    try {
      const m = await api.post<Mensaje>("/mensajes", { texto: t });
      setDatos([...(mensajes ?? []), m]);
      setTexto("");
      void recargarCola();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="flex h-[calc(100dvh-9rem)] flex-col md:h-[calc(100dvh-7.5rem)]">
      <Encabezado
        titulo="Asistente"
        accion={
          <Estado nivel="neutro" icono={Bot}>
            IA sin conectar
          </Estado>
        }
      />

      <Panel className="mb-4 flex items-start gap-3 p-4">
        <Database className="mt-0.5 size-5 shrink-0 text-acento" aria-hidden />
        <div className="text-sm">
          <p>Puedes escribir lo que sientes. Tus mensajes se guardan en este perfil y quedan listos para el asistente cuando se integre.</p>
          <p className="mt-1 text-tinta-tenue">
            Por ahora no hay respuestas automáticas. Si algo te preocupa, avisa a la tripulación o al responsable médico de la misión.
            {cola && ` · ${cola.pendientes} datos esperando a la IA.`}
          </p>
        </div>
      </Panel>

      <div className="flex-1 overflow-y-auto pr-1">
        {mensajes && !mensajes.length && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
              <Bot className="size-12 text-tinta-tenue" aria-hidden />
            </motion.div>
            <p className="max-w-sm text-tinta-suave">Empieza contando cómo te sientes, un síntoma o una medición.</p>
            <div className="flex max-w-lg flex-wrap justify-center gap-2">
              {SUGERENCIAS.map((s) => (
                <button key={s} onClick={() => void enviar(undefined, s)} className="rounded-full bg-casco-alto px-3 py-1.5 text-sm text-tinta-suave ring-1 ring-borde hover:text-tinta hover:ring-acento/50">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        <ol className="flex flex-col gap-3 pb-2">
          <AnimatePresence initial={false}>
            {mensajes?.map((m) => (
              <motion.li
                key={m.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={cn("flex max-w-[80%] flex-col gap-1", m.autor === "usuario" ? "self-end items-end" : "self-start")}
              >
                <p className={cn("whitespace-pre-line rounded-2xl px-4 py-2.5", m.autor === "usuario" ? "rounded-tr-sm bg-acento text-acento-tinta" : "rounded-tl-sm bg-casco-alto")}>{m.texto}</p>
                <span className="text-xs text-tinta-tenue">
                  {fechaHora(m.creado)}
                  {m.meta.etapa && ` · ${nombreEtapa(m.meta.etapa)}`} · guardado
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
        <div ref={fin} />
      </div>

      <form onSubmit={enviar} className="mt-3 flex items-end gap-2 rounded-2xl bg-casco/85 p-2 ring-1 ring-borde focus-within:ring-acento/60">
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void enviar();
            }
          }}
          rows={1}
          maxLength={4000}
          placeholder="Escribe un mensaje"
          className="max-h-40 min-h-10 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
          aria-label="Mensaje"
        />
        <Button type="submit" size="icon" disabled={!texto.trim()} aria-label="Guardar mensaje">
          <SendHorizonal className="size-4" />
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-critico">{error}</p>}
    </div>
  );
}
