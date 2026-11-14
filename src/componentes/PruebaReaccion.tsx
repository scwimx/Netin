import { Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/componentes/ui/button";
import { cn } from "@/lib/utils";

const INTENTOS = 5;

type Fase = "lista" | "espera" | "estimulo" | "anticipo" | "resultado" | "fin";

export interface ResultadoReaccion {
  intentos: number[];
  anticipos: number;
}

/**
 * Prueba de reacción visual: toca (o pulsa la barra espaciadora) en cuanto el
 * círculo se ilumine. Cinco intentos válidos. Tocar antes cuenta como anticipo
 * y se repite el intento.
 */
export function PruebaReaccion({ alTerminar }: { alTerminar: (r: ResultadoReaccion) => void }) {
  const [fase, setFase] = useState<Fase>("lista");
  const [tiempos, setTiempos] = useState<number[]>([]);
  const [anticipos, setAnticipos] = useState(0);
  const [ultimo, setUltimo] = useState<number | null>(null);
  const inicio = useRef(0);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);

  const programar = useCallback(() => {
    setFase("espera");
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      inicio.current = performance.now();
      setFase("estimulo");
    }, 1200 + Math.random() * 2600);
  }, []);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  const tocar = useCallback(() => {
    if (fase === "lista" || fase === "resultado" || fase === "anticipo") return programar();
    if (fase === "espera") {
      clearTimeout(temporizador.current);
      setAnticipos((a) => a + 1);
      setFase("anticipo");
      return;
    }
    if (fase === "estimulo") {
      const t = Math.round(performance.now() - inicio.current);
      const nuevos = [...tiempos, t];
      setTiempos(nuevos);
      setUltimo(t);
      setFase(nuevos.length >= INTENTOS ? "fin" : "resultado");
    }
  }, [fase, programar, tiempos]);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.code !== "Space" || fase === "fin") return;
      if ((e.target as HTMLElement)?.tagName === "BUTTON" && fase !== "estimulo" && fase !== "espera") return;
      e.preventDefault();
      tocar();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [fase, tocar]);

  const reiniciar = () => {
    setTiempos([]);
    setAnticipos(0);
    setUltimo(null);
    setFase("lista");
  };

  const textos: Record<Fase, string> = {
    lista: "Toca el círculo o pulsa la barra espaciadora para empezar.",
    espera: "Espera a que se ilumine…",
    estimulo: "¡Ahora!",
    anticipo: "Muy pronto. Toca para repetir el intento.",
    resultado: "Toca para el siguiente intento.",
    fin: "Prueba completa.",
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-2" aria-label={`${tiempos.length} de ${INTENTOS} intentos`}>
        {Array.from({ length: INTENTOS }, (_, i) => (
          <span key={i} className={cn("h-1.5 w-8 rounded-full transition-colors", i < tiempos.length ? "bg-acento" : "bg-casco-alto")} />
        ))}
      </div>

      <button
        type="button"
        onPointerDown={(e) => {
          if (fase === "fin") return;
          e.preventDefault();
          tocar();
        }}
        disabled={fase === "fin"}
        aria-label="Zona de reacción"
        className="relative flex size-56 touch-manipulation select-none items-center justify-center rounded-full outline-none sm:size-64"
      >
        <span className={cn("absolute inset-0 rounded-full ring-1 ring-inset transition-colors", fase === "anticipo" ? "ring-aviso" : "ring-borde")} />
        <AnimatePresence>
          {fase === "estimulo" && (
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.06 }}
              className="absolute inset-3 rounded-full bg-acento shadow-[0_0_80px_var(--acento)]"
            />
          )}
        </AnimatePresence>
        {fase === "espera" && <span className="respira absolute inset-10 rounded-full bg-casco-alto" />}
        <span className={cn("relative font-display text-4xl font-semibold cifra", fase === "estimulo" && "text-acento-tinta")}>
          {fase === "estimulo" ? <Zap className="size-12" /> : fase === "resultado" || fase === "fin" ? `${ultimo} ms` : fase === "anticipo" ? "Pronto" : ""}
        </span>
      </button>

      <p className="min-h-6 text-center text-tinta-suave" aria-live="polite">
        {textos[fase]}
      </p>

      {fase === "fin" && (
        <div className="flex flex-col items-center gap-4">
          <ul className="flex flex-wrap justify-center gap-2 text-sm">
            {tiempos.map((t, i) => (
              <li key={i} className="cifra rounded-md bg-casco-alto px-2.5 py-1">
                {t} ms
              </li>
            ))}
          </ul>
          {anticipos > 0 && <p className="text-sm text-tinta-suave">Anticipos: {anticipos}</p>}
          <div className="flex gap-2">
            <Button variant="outline" onClick={reiniciar}>
              Repetir prueba
            </Button>
            <Button onClick={() => alTerminar({ intentos: tiempos, anticipos })}>Guardar resultado</Button>
          </div>
        </div>
      )}
    </div>
  );
}
