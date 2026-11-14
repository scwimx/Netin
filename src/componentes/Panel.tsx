import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  titulo,
  accion,
  children,
  className,
  id,
}: {
  titulo?: ReactNode;
  accion?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("rounded-2xl bg-casco/75 p-5 ring-1 ring-inset ring-borde/80 backdrop-blur-sm", className)}>
      {(titulo || accion) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {titulo && <h2 className="text-base font-semibold">{titulo}</h2>}
          {accion}
        </div>
      )}
      {children}
    </section>
  );
}

export function Vacio({ children, accion }: { children: ReactNode; accion?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center text-sm text-tinta-suave">
      <p className="max-w-xs">{children}</p>
      {accion}
    </div>
  );
}

export function Encabezado({ titulo, descripcion, accion }: { titulo: string; descripcion?: string; accion?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{titulo}</h1>
        {descripcion && <p className="mt-1 max-w-prose text-tinta-suave">{descripcion}</p>}
      </div>
      {accion}
    </div>
  );
}
