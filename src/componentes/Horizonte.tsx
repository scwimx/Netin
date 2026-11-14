import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";
import type { EtapaId } from "@compartido/catalogos";

// Fondo vivo: el horizonte del lugar donde está la misión.
// Tierra: amanecer sobre el océano. Órbita: el limbo terrestre visto desde arriba.
// Tránsito: espacio profundo con la Tierra como un punto. Marte: el limbo ocre.

const ESCENAS: Record<EtapaId, { cielo: string; planeta: string[]; brillo: string; radio: number; cy: number }> = {
  tierra: { cielo: "#0c1a2a", planeta: ["#0f3a4a", "#0a2733", "#081820"], brillo: "#4fd1a5", radio: 1400, cy: 1560 },
  orbita: { cielo: "#080d1a", planeta: ["#1d6fa3", "#123f66", "#0a1f38"], brillo: "#7fdcff", radio: 900, cy: 1120 },
  transito: { cielo: "#070a16", planeta: ["#1b1740", "#100d29", "#080714"], brillo: "#a99bff", radio: 0, cy: 0 },
  marte: { cielo: "#120c10", planeta: ["#8a4a2a", "#5a2c1a", "#2a140d"], brillo: "#e9a877", radio: 1000, cy: 1200 },
};

function estrellas(n: number, semilla: number) {
  let s = semilla;
  const azar = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: n }, () => ({ x: azar() * 1600, y: azar() * 520, r: azar() * 1.2 + 0.3, o: azar() * 0.6 + 0.2, d: azar() * 6 + 3 }));
}

export function Horizonte({ etapa }: { etapa: EtapaId }) {
  const quieto = useReducedMotion();
  const e = ESCENAS[etapa];
  const puntos = useMemo(() => estrellas(etapa === "transito" ? 140 : 70, etapa.length * 97), [etapa]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <AnimatePresence mode="popLayout">
        <motion.svg
          key={etapa}
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 1600 900"
          preserveAspectRatio="xMidYMax slice"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          <defs>
            <radialGradient id={`planeta-${etapa}`} cx="50%" cy="0%" r="70%">
              <stop offset="0%" stopColor={e.planeta[0]} />
              <stop offset="45%" stopColor={e.planeta[1]} />
              <stop offset="100%" stopColor={e.planeta[2]} />
            </radialGradient>
            <radialGradient id={`halo-${etapa}`} cx="50%" cy="100%" r="60%">
              <stop offset="0%" stopColor={e.brillo} stopOpacity="0.22" />
              <stop offset="100%" stopColor={e.brillo} stopOpacity="0" />
            </radialGradient>
            <filter id="desenfoque">
              <feGaussianBlur stdDeviation="18" />
            </filter>
          </defs>

          <rect width="1600" height="900" fill={e.cielo} />

          <g>
            {puntos.map((p, i) => (
              <motion.circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={p.r}
                fill="#dfe8ff"
                initial={{ opacity: p.o }}
                animate={quieto ? undefined : { opacity: [p.o, p.o * 0.3, p.o] }}
                transition={{ duration: p.d, repeat: Infinity, ease: "easeInOut", delay: i * 0.05 }}
              />
            ))}
          </g>

          {e.radio > 0 ? (
            <motion.g
              initial={{ y: 60 }}
              animate={quieto ? { y: 0 } : { y: [0, -8, 0] }}
              transition={quieto ? { duration: 0 } : { duration: 18, repeat: Infinity, ease: "easeInOut" }}
            >
              <rect x="0" y="560" width="1600" height="340" fill={`url(#halo-${etapa})`} />
              <circle cx="800" cy={e.cy} r={e.radio + 26} fill={e.brillo} opacity="0.18" filter="url(#desenfoque)" />
              <circle cx="800" cy={e.cy} r={e.radio + 4} fill="none" stroke={e.brillo} strokeOpacity="0.45" strokeWidth="2" />
              <circle cx="800" cy={e.cy} r={e.radio} fill={`url(#planeta-${etapa})`} />
            </motion.g>
          ) : (
            <g>
              {/* Tránsito: la Tierra queda atrás como un punto azul */}
              <motion.circle
                cx="1260"
                cy="220"
                r="4"
                fill="#7fc8ff"
                animate={quieto ? undefined : { opacity: [0.9, 0.5, 0.9] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              <circle cx="1260" cy="220" r="16" fill="#7fc8ff" opacity="0.12" />
              <rect x="0" y="0" width="1600" height="900" fill={`url(#halo-${etapa})`} opacity="0.7" />
            </g>
          )}
        </motion.svg>
      </AnimatePresence>
      {/* Velo para que el contenido siempre se lea */}
      <div className="absolute inset-0 bg-gradient-to-b from-vacio/70 via-vacio/85 to-vacio/95" />
    </div>
  );
}
