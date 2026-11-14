import { motion, useReducedMotion } from "motion/react";
import { nombreZona, type Vista, type ZonaId } from "@compartido/catalogos";
import { cn } from "@/lib/utils";

// Figura estilizada en un lienzo de 200 × 460. Las formas se definen por el
// lado del dibujo (izquierda/derecha de quien mira). En la vista frontal la
// derecha de la persona queda a la izquierda del dibujo; en la posterior, no.

type Forma = { t: "e"; cx: number; cy: number; rx: number; ry: number } | { t: "r"; x: number; y: number; w: number; h: number; rx: number };
type Lado = "izqDibujo" | "derDibujo" | "centro";

const FORMAS: { base: string; lado: Lado; forma: Forma; soloVista?: Vista }[] = [
  { base: "cabeza", lado: "centro", forma: { t: "e", cx: 100, cy: 40, rx: 24, ry: 30 } },
  { base: "cuello", lado: "centro", forma: { t: "r", x: 89, y: 68, w: 22, h: 17, rx: 5 } },
  { base: "hombro", lado: "izqDibujo", forma: { t: "e", cx: 68, cy: 97, rx: 15, ry: 12 } },
  { base: "hombro", lado: "derDibujo", forma: { t: "e", cx: 132, cy: 97, rx: 15, ry: 12 } },
  { base: "pecho", lado: "centro", soloVista: "frontal", forma: { t: "r", x: 78, y: 87, w: 44, h: 55, rx: 9 } },
  { base: "abdomen", lado: "centro", soloVista: "frontal", forma: { t: "r", x: 80, y: 145, w: 40, h: 45, rx: 7 } },
  { base: "espalda_alta", lado: "centro", soloVista: "posterior", forma: { t: "r", x: 78, y: 87, w: 44, h: 55, rx: 9 } },
  { base: "espalda_baja", lado: "centro", soloVista: "posterior", forma: { t: "r", x: 80, y: 145, w: 40, h: 45, rx: 7 } },
  { base: "cadera", lado: "centro", forma: { t: "r", x: 76, y: 193, w: 48, h: 29, rx: 9 } },
  { base: "brazo", lado: "izqDibujo", forma: { t: "r", x: 50, y: 110, w: 18, h: 56, rx: 8 } },
  { base: "brazo", lado: "derDibujo", forma: { t: "r", x: 132, y: 110, w: 18, h: 56, rx: 8 } },
  { base: "antebrazo", lado: "izqDibujo", forma: { t: "r", x: 43, y: 170, w: 17, h: 56, rx: 7 } },
  { base: "antebrazo", lado: "derDibujo", forma: { t: "r", x: 140, y: 170, w: 17, h: 56, rx: 7 } },
  { base: "mano", lado: "izqDibujo", forma: { t: "e", cx: 50, cy: 241, rx: 9, ry: 13 } },
  { base: "mano", lado: "derDibujo", forma: { t: "e", cx: 150, cy: 241, rx: 9, ry: 13 } },
  { base: "muslo", lado: "izqDibujo", forma: { t: "r", x: 78, y: 225, w: 20, h: 80, rx: 9 } },
  { base: "muslo", lado: "derDibujo", forma: { t: "r", x: 102, y: 225, w: 20, h: 80, rx: 9 } },
  { base: "rodilla", lado: "izqDibujo", forma: { t: "e", cx: 88, cy: 316, rx: 10, ry: 10 } },
  { base: "rodilla", lado: "derDibujo", forma: { t: "e", cx: 112, cy: 316, rx: 10, ry: 10 } },
  { base: "pierna", lado: "izqDibujo", forma: { t: "r", x: 80, y: 329, w: 17, h: 80, rx: 8 } },
  { base: "pierna", lado: "derDibujo", forma: { t: "r", x: 103, y: 329, w: 17, h: 80, rx: 8 } },
  { base: "pie", lado: "izqDibujo", forma: { t: "e", cx: 87, cy: 422, rx: 11, ry: 8 } },
  { base: "pie", lado: "derDibujo", forma: { t: "e", cx: 113, cy: 422, rx: 11, ry: 8 } },
];

function zonaDe(base: string, lado: Lado, vista: Vista): ZonaId {
  if (lado === "centro") return base as ZonaId;
  // Frontal: izquierda del dibujo = derecha de la persona.
  const derechaPersona = vista === "frontal" ? lado === "izqDibujo" : lado === "derDibujo";
  return `${base}_${derechaPersona ? "der" : "izq"}` as ZonaId;
}

const COLOR: Record<number, string> = { 1: "var(--aviso)", 2: "var(--aviso)", 3: "var(--serio)", 4: "var(--critico)", 5: "var(--critico)" };

export function FiguraCorporal({
  vista,
  intensidades,
  seleccionada,
  alElegir,
  escanear = false,
  className,
}: {
  vista: Vista;
  intensidades: Partial<Record<ZonaId, number>>;
  seleccionada: ZonaId | null;
  alElegir: (z: ZonaId) => void;
  escanear?: boolean;
  className?: string;
}) {
  const quieto = useReducedMotion();
  return (
    <svg viewBox="0 0 200 460" className={cn("h-full w-full", className)} role="group" aria-label={vista === "frontal" ? "Vista frontal" : "Vista posterior"}>
      <defs>
        <linearGradient id={`barrido-${vista}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--acento)" stopOpacity="0" />
          <stop offset="85%" stopColor="var(--acento)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--acento)" stopOpacity="0.75" />
        </linearGradient>
        {/* El barrido solo ilumina la silueta */}
        <clipPath id={`silueta-${vista}`}>
          {FORMAS.filter((f) => !f.soloVista || f.soloVista === vista).map((f, i) =>
            f.forma.t === "e" ? (
              <ellipse key={i} cx={f.forma.cx} cy={f.forma.cy} rx={f.forma.rx} ry={f.forma.ry} />
            ) : (
              <rect key={i} x={f.forma.x} y={f.forma.y} width={f.forma.w} height={f.forma.h} rx={f.forma.rx} />
            ),
          )}
        </clipPath>
        <filter id="resplandor" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {FORMAS.filter((f) => !f.soloVista || f.soloVista === vista).map((f, i) => {
        const zona = zonaDe(f.base, f.lado, vista);
        const intensidad = intensidades[zona];
        const elegida = seleccionada === zona;
        const comun = {
          fill: intensidad ? COLOR[intensidad] : "var(--casco-alto)",
          stroke: elegida ? "var(--acento)" : intensidad ? COLOR[intensidad] : "var(--borde)",
          strokeWidth: elegida ? 2.5 : 1,
          className: cn("transition-[fill,stroke] duration-300", intensidad ? "zona-activa" : "hover:fill-[var(--borde)]"),
          style: intensidad ? { fillOpacity: 0.7 } : undefined,
          filter: elegida ? "url(#resplandor)" : undefined,
        };
        return (
          <g
            key={i}
            role="button"
            tabIndex={0}
            aria-pressed={elegida}
            aria-label={`${nombreZona(zona)}${intensidad ? `, síntoma activo de intensidad ${intensidad}` : ""}`}
            onClick={() => alElegir(zona)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), alElegir(zona))}
            className="cursor-pointer outline-none [&:focus-visible>*]:stroke-[var(--acento)] [&:focus-visible>*]:[stroke-width:2.5]"
          >
            {f.forma.t === "e" ? (
              <ellipse cx={f.forma.cx} cy={f.forma.cy} rx={f.forma.rx} ry={f.forma.ry} {...comun} />
            ) : (
              <rect x={f.forma.x} y={f.forma.y} width={f.forma.w} height={f.forma.h} rx={f.forma.rx} {...comun} />
            )}
          </g>
        );
      })}

      {vista === "posterior" && <line x1="100" y1="88" x2="100" y2="190" stroke="var(--borde)" strokeDasharray="2 4" aria-hidden />}

      {escanear && !quieto && (
        <g clipPath={`url(#silueta-${vista})`} style={{ pointerEvents: "none" }} aria-hidden>
          <motion.rect
            x="0"
            width="200"
            height="36"
            fill={`url(#barrido-${vista})`}
            initial={{ y: -36 }}
            animate={{ y: [-36, 440] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 2.5 }}
          />
        </g>
      )}
    </svg>
  );
}

/** Ambas vistas lado a lado con su título. */
export function MapaCorporal(props: {
  intensidades: Partial<Record<ZonaId, number>>;
  seleccionada: ZonaId | null;
  alElegir: (z: ZonaId) => void;
  escanear?: boolean;
  alto?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {(["frontal", "posterior"] as const).map((v) => (
        <figure key={v} className="flex flex-col items-center gap-2">
          <figcaption className="text-sm text-tinta-suave">{v === "frontal" ? "Frente" : "Espalda"}</figcaption>
          <div className={cn("w-full", props.alto ?? "h-[420px]")}>
            <FiguraCorporal vista={v} {...props} />
          </div>
        </figure>
      ))}
    </div>
  );
}

export function LeyendaMapa() {
  const items = [
    { color: "var(--casco-alto)", borde: "var(--borde)", texto: "Sin síntomas" },
    { color: "var(--aviso)", texto: "Leve o molesto (1–2)" },
    { color: "var(--serio)", texto: "Moderado (3)" },
    { color: "var(--critico)", texto: "Severo o más (4–5)" },
    { color: "transparent", borde: "var(--acento)", texto: "Zona elegida" },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-tinta-suave">
      {items.map((i) => (
        <li key={i.texto} className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm" style={{ background: i.color, boxShadow: i.borde ? `inset 0 0 0 1.5px ${i.borde}` : undefined }} />
          {i.texto}
        </li>
      ))}
    </ul>
  );
}
