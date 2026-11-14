import { Globe2, Orbit, Rocket, Mountain, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { ETAPAS, type EtapaId } from "@compartido/catalogos";
import { cn } from "@/lib/utils";

export const ICONO_ETAPA: Record<EtapaId, LucideIcon> = {
  tierra: Globe2,
  orbita: Orbit,
  transito: Rocket,
  marte: Mountain,
};

/** Cuatro etapas seleccionables. La elegida se marca con color, ícono y texto. */
export function SelectorEtapa({
  valor,
  alCambiar,
  compacto = false,
}: {
  valor: EtapaId;
  alCambiar: (e: EtapaId) => void;
  compacto?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Etapa de la misión" className={cn("grid gap-2", compacto ? "grid-cols-4" : "grid-cols-2 sm:grid-cols-4")}>
      {ETAPAS.map((e) => {
        const Icono = ICONO_ETAPA[e.id];
        const activa = e.id === valor;
        return (
          <button
            key={e.id}
            type="button"
            role="radio"
            aria-checked={activa}
            aria-label={e.nombre}
            onClick={() => alCambiar(e.id)}
            data-etapa-boton={e.id}
            className={cn(
              "relative flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
              activa ? "text-acento-tinta" : "bg-casco-alto/60 text-tinta-suave hover:bg-casco-alto hover:text-tinta",
            )}
          >
            {activa && (
              <motion.span layoutId={`etapa-activa-${compacto}`} className="absolute inset-0 rounded-lg bg-acento" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />
            )}
            <Icono className="relative size-4 shrink-0" aria-hidden />
            <span className="relative font-medium leading-tight">{e.nombre}</span>
          </button>
        );
      })}
    </div>
  );
}
