import { ChevronDown, FileText, HeartPulse, Home, ListChecks, MessageCircle, Settings, Siren } from "lucide-react";
import { motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { nombreEtapa } from "@compartido/catalogos";
import { Horizonte } from "@/componentes/Horizonte";
import { DialogoAviso } from "@/componentes/DialogoAviso";
import { ICONO_ETAPA, SelectorEtapa } from "@/componentes/SelectorEtapa";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { usePerfil, useSesion } from "@/hooks/useSesion";
import { cn } from "@/lib/utils";

const PRINCIPALES = [
  { a: "/", texto: "Inicio", icono: Home },
  { a: "/asistente", texto: "Asistente", icono: MessageCircle },
  { a: "/salud", texto: "Salud", icono: HeartPulse },
  { a: "/registros", texto: "Registros", icono: ListChecks },
];
const SECUNDARIOS = [
  { a: "/documentos", texto: "Documentos", icono: FileText },
  { a: "/ajustes", texto: "Ajustes", icono: Settings },
];

function Enlace({ a, texto, icono: Icono }: (typeof PRINCIPALES)[number]) {
  const { pathname } = useLocation();
  const activo = a === "/" ? pathname === "/" : pathname.startsWith(a);
  return (
    <NavLink
      to={a}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        activo ? "text-tinta" : "text-tinta-suave hover:text-tinta",
      )}
    >
      {activo && (
        <motion.span
          layoutId="nav-activo"
          className="absolute inset-0 rounded-lg bg-acento-suave ring-1 ring-inset ring-acento/30"
          transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
        />
      )}
      <Icono className={cn("relative size-[18px]", activo && "text-acento")} aria-hidden />
      <span className="relative">{texto}</span>
    </NavLink>
  );
}

function EnlaceMovil({ a, texto, icono: Icono }: (typeof PRINCIPALES)[number]) {
  const { pathname } = useLocation();
  const activo = a === "/" ? pathname === "/" : pathname.startsWith(a);
  return (
    <NavLink to={a} className={cn("flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]", activo ? "text-acento" : "text-tinta-suave")}>
      <Icono className="size-5" aria-hidden />
      {texto}
    </NavLink>
  );
}

export function Marco({ children }: { children: ReactNode }) {
  const perfil = usePerfil();
  const { cambiarEtapa } = useSesion();
  const [etapaAbierta, setEtapaAbierta] = useState(false);
  const [avisoAbierto, setAvisoAbierto] = useState(false);
  const IconoEtapa = ICONO_ETAPA[perfil.etapa];
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-dvh">
      <Horizonte etapa={perfil.etapa} />

      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-borde/60 bg-casco/55 px-3 py-5 backdrop-blur-md md:flex">
        <div className="mb-6 flex items-center gap-2.5 px-3">
          <img src="/netin.svg" alt="" className="size-7" />
          <div className="leading-tight">
            <p className="font-display text-base font-semibold">{perfil.ajustes.comoLlamarte || perfil.nombre.split(" ")[0]}</p>
            <p className="text-xs text-tinta-tenue">{perfil.rol || "Tripulación"}</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1" aria-label="Principal">
          {PRINCIPALES.map((e) => (
            <Enlace key={e.a} {...e} />
          ))}
        </nav>
        <nav className="mt-auto flex flex-col gap-1" aria-label="Secundaria">
          {SECUNDARIOS.map((e) => (
            <Enlace key={e.a} {...e} />
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-end gap-2 border-b border-borde/40 bg-vacio/60 px-4 py-3 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setAvisoAbierto(true)}
            className="mr-auto inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-critico ring-1 ring-inset ring-critico/40 transition-colors hover:bg-critico/10 md:mr-0"
          >
            <Siren className="size-4" aria-hidden />
            Aviso
          </button>
          <button
            type="button"
            onClick={() => setEtapaAbierta(true)}
            className="inline-flex items-center gap-2.5 rounded-full bg-casco/80 py-1.5 pl-3 pr-2.5 ring-1 ring-inset ring-borde transition-colors hover:ring-acento/50"
            aria-label={`Netin, etapa actual: ${nombreEtapa(perfil.etapa)}. Cambiar etapa`}
          >
            <span className="font-display text-sm font-semibold tracking-tight">Netin</span>
            <span className="h-4 w-px bg-borde" aria-hidden />
            <span className="inline-flex items-center gap-1.5 text-sm text-acento">
              <IconoEtapa className="size-4" aria-hidden />
              {nombreEtapa(perfil.etapa)}
            </span>
            <ChevronDown className="size-3.5 text-tinta-tenue" aria-hidden />
          </button>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-10">
          <motion.div key={pathname.split("/")[1]} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: "easeOut" }}>
            {children}
          </motion.div>
        </main>
      </div>

      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-borde/60 bg-casco/95 backdrop-blur-md md:hidden">
        {[...PRINCIPALES, ...SECUNDARIOS].map((e) => (
          <EnlaceMovil key={e.a} {...e} />
        ))}
      </nav>

      <Dialog open={etapaAbierta} onOpenChange={setEtapaAbierta}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Dónde estás ahora?</DialogTitle>
            <DialogDescription>Cada registro nuevo guarda la etapa en la que ocurrió.</DialogDescription>
          </DialogHeader>
          <SelectorEtapa
            valor={perfil.etapa}
            alCambiar={async (e) => {
              await cambiarEtapa(e);
              setEtapaAbierta(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <DialogoAviso abierto={avisoAbierto} alCerrar={() => setAvisoAbierto(false)} />
    </div>
  );
}
