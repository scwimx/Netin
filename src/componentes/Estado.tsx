import { AlertOctagon, AlertTriangle, CheckCircle2, CircleDashed, Info, ShieldAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Estados reservados: siempre color + ícono + etiqueta, nunca solo color.
export type Nivel = "bien" | "aviso" | "serio" | "critico" | "info" | "neutro";

const ESTILOS: Record<Nivel, { icono: LucideIcon; clase: string }> = {
  bien: { icono: CheckCircle2, clase: "text-bien bg-bien/12 ring-bien/30" },
  aviso: { icono: AlertTriangle, clase: "text-aviso bg-aviso/12 ring-aviso/30" },
  serio: { icono: ShieldAlert, clase: "text-serio bg-serio/12 ring-serio/30" },
  critico: { icono: AlertOctagon, clase: "text-critico bg-critico/12 ring-critico/35" },
  info: { icono: Info, clase: "text-info bg-info/12 ring-info/30" },
  neutro: { icono: CircleDashed, clase: "text-tinta-suave bg-casco-alto ring-borde" },
};

export function Estado({
  nivel,
  children,
  icono,
  className,
}: {
  nivel: Nivel;
  children: ReactNode;
  icono?: LucideIcon;
  className?: string;
}) {
  const e = ESTILOS[nivel];
  const Icono = icono ?? e.icono;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset", e.clase, className)}>
      <Icono className="size-3.5 shrink-0" aria-hidden />
      {children}
    </span>
  );
}

/** Color de una intensidad 1–5 (síntomas). */
export function nivelIntensidad(n: number): Nivel {
  if (n >= 4) return "critico";
  if (n === 3) return "serio";
  return "aviso";
}

/** Etiqueta del origen de una medición o resumen. */
export function Origen({ origen }: { origen: string }) {
  const mapa: Record<string, { nivel: Nivel; texto: string }> = {
    manual: { nivel: "info", texto: "Manual" },
    simulada: { nivel: "neutro", texto: "Simulada" },
    importada: { nivel: "bien", texto: "Importada" },
    automatico: { nivel: "neutro", texto: "Resumen automático" },
    ia: { nivel: "info", texto: "Resumen de IA" },
    simulado: { nivel: "neutro", texto: "Simulado" },
  };
  const m = mapa[origen] ?? { nivel: "neutro" as Nivel, texto: origen };
  return <Estado nivel={m.nivel}>{m.texto}</Estado>;
}
