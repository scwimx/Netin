import { Activity, Brain, PersonStanding, Timer } from "lucide-react";
import { motion } from "motion/react";
import { NavLink, Route, Routes } from "react-router-dom";
import { Encabezado } from "@/componentes/Panel";
import { cn } from "@/lib/utils";
import { General } from "./General";
import { Fisico } from "./Fisico";
import { Mental } from "./Mental";
import { Motora } from "./Motora";

const PESTANAS = [
  { a: "/salud", texto: "General", icono: Activity, fin: true },
  { a: "/salud/fisico", texto: "Físico", icono: PersonStanding },
  { a: "/salud/mental", texto: "Mental", icono: Brain },
  { a: "/salud/motora", texto: "Habilidades motoras", icono: Timer },
];

export function Salud() {
  return (
    <div>
      <Encabezado titulo="Salud" />
      <nav className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-casco/70 p-1 ring-1 ring-borde/70" aria-label="Secciones de salud">
        {PESTANAS.map((p) => (
          <NavLink key={p.a} to={p.a} end={p.fin} className="relative flex-1 whitespace-nowrap">
            {({ isActive }) => (
              <span className={cn("relative flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors", isActive ? "text-acento-tinta" : "text-tinta-suave hover:text-tinta")}>
                {isActive && <motion.span layoutId="pestana-salud" className="absolute inset-0 rounded-lg bg-acento" transition={{ type: "spring", bounce: 0.15, duration: 0.4 }} />}
                <p.icono className="relative size-4" aria-hidden />
                <span className="relative">{p.texto}</span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <Routes>
        <Route index element={<General />} />
        <Route path="fisico" element={<Fisico />} />
        <Route path="mental" element={<Mental />} />
        <Route path="motora" element={<Motora />} />
      </Routes>
    </div>
  );
}
