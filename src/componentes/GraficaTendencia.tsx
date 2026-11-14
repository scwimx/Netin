import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { INDICADORES, indicador, type DatosVital, type IndicadorId, type Registro } from "@compartido/catalogos";
import { fechaHora } from "@/lib/formato";
import { cn } from "@/lib/utils";

// Una sola serie por gráfica (un eje). El origen de cada punto se codifica con
// la forma del marcador, además del texto del tooltip y la leyenda.

const ORIGEN_TEXTO: Record<string, string> = { manual: "Manual", simulada: "Simulada", importada: "Importada" };

function Marcador(props: { cx?: number; cy?: number; payload?: { origen: string } }) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined || !payload) return null;
  if (payload.origen === "importada") return <rect x={cx - 4.5} y={cy - 4.5} width={9} height={9} rx={1.5} fill="var(--acento)" stroke="var(--casco)" strokeWidth={2} />;
  if (payload.origen === "simulada") return <circle cx={cx} cy={cy} r={4.5} fill="var(--casco)" stroke="var(--acento)" strokeWidth={2} />;
  return <circle cx={cx} cy={cy} r={4.5} fill="var(--acento)" stroke="var(--casco)" strokeWidth={2} />;
}

function Leyenda() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-tinta-suave" aria-label="Origen de las mediciones">
      <li className="flex items-center gap-1.5">
        <svg width="12" height="12" aria-hidden>
          <circle cx="6" cy="6" r="4.5" fill="var(--acento)" />
        </svg>
        Manual
      </li>
      <li className="flex items-center gap-1.5">
        <svg width="12" height="12" aria-hidden>
          <circle cx="6" cy="6" r="4" fill="none" stroke="var(--acento)" strokeWidth="2" />
        </svg>
        Simulada
      </li>
      <li className="flex items-center gap-1.5">
        <svg width="12" height="12" aria-hidden>
          <rect x="1.5" y="1.5" width="9" height="9" rx="1.5" fill="var(--acento)" />
        </svg>
        Importada
      </li>
    </ul>
  );
}

export function GraficaTendencia({ vitales, alto = 220 }: { vitales: Registro<DatosVital>[]; alto?: number }) {
  const disponibles = INDICADORES.filter((i) => vitales.some((v) => v.datos.indicador === i.id));
  const [elegido, setElegido] = useState<IndicadorId | null>(null);
  const actual = elegido && disponibles.some((d) => d.id === elegido) ? elegido : (disponibles[0]?.id ?? null);
  const [verTabla, setVerTabla] = useState(false);

  const puntos = useMemo(
    () =>
      vitales
        .filter((v) => v.datos.indicador === actual)
        .map((v) => ({ t: new Date(v.datos.medidoEn).getTime(), valor: v.datos.valor, valor2: v.datos.valor2, origen: v.datos.origen, etapa: v.etapa }))
        .sort((a, b) => a.t - b.t)
        .slice(-40),
    [vitales, actual],
  );

  if (!disponibles.length)
    return <p className="py-8 text-center text-sm text-tinta-suave">Todavía no hay mediciones. Agrega una en Salud o importa un archivo.</p>;

  const ind = indicador(actual!)!;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Indicador">
        {disponibles.map((d) => (
          <button
            key={d.id}
            role="tab"
            aria-selected={d.id === actual}
            onClick={() => setElegido(d.id)}
            className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", d.id === actual ? "bg-acento text-acento-tinta" : "bg-casco-alto text-tinta-suave hover:text-tinta")}
          >
            {d.nombre}
          </button>
        ))}
        <button onClick={() => setVerTabla((v) => !v)} className="ml-auto text-xs text-tinta-suave underline-offset-2 hover:underline">
          {verTabla ? "Ver gráfica" : "Ver tabla"}
        </button>
      </div>

      {verTabla ? (
        <div className="max-h-64 overflow-auto rounded-lg ring-1 ring-borde">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-casco-alto text-left text-xs text-tinta-suave">
              <tr>
                <th className="px-3 py-2 font-medium">Cuándo</th>
                <th className="px-3 py-2 font-medium">Valor</th>
                <th className="px-3 py-2 font-medium">Origen</th>
              </tr>
            </thead>
            <tbody>
              {[...puntos].reverse().map((p) => (
                <tr key={p.t} className="border-t border-borde/60">
                  <td className="px-3 py-1.5">{fechaHora(new Date(p.t).toISOString())}</td>
                  <td className="cifra px-3 py-1.5">
                    {p.valor2 !== undefined ? `${p.valor}/${p.valor2}` : p.valor} {ind.unidad}
                  </td>
                  <td className="px-3 py-1.5">{ORIGEN_TEXTO[p.origen]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ height: alto }} role="img" aria-label={`Tendencia de ${ind.nombre}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={puntos} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
              <CartesianGrid stroke="var(--borde)" strokeOpacity={0.5} vertical={false} />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(t) => new Date(t).toLocaleDateString("es", { day: "numeric", month: "short" })}
                stroke="var(--tinta-tenue)"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis stroke="var(--tinta-tenue)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} width={44} />
              <Tooltip
                cursor={{ stroke: "var(--tinta-tenue)", strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as (typeof puntos)[number];
                  return (
                    <div className="rounded-lg bg-popover px-3 py-2 text-xs shadow-xl ring-1 ring-borde">
                      <p className="font-display text-base cifra text-tinta">
                        {p.valor2 !== undefined ? `${p.valor}/${p.valor2}` : p.valor} {ind.unidad}
                      </p>
                      <p className="text-tinta-suave">{fechaHora(new Date(p.t).toISOString())}</p>
                      <p className="text-tinta-suave">Medición {ORIGEN_TEXTO[p.origen].toLowerCase()}</p>
                    </div>
                  );
                }}
              />
              <Line type="monotone" dataKey="valor" stroke="var(--acento)" strokeWidth={2} dot={<Marcador />} activeDot={{ r: 6 }} isAnimationActive animationDuration={700} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <Leyenda />
    </div>
  );
}
