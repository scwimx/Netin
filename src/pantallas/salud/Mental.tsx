import { Bot, MessageSquareQuote, Moon } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DatosBitacora, DatosChequeo, Registro } from "@compartido/catalogos";
import { Estado } from "@/componentes/Estado";
import { Panel, Vacio } from "@/componentes/Panel";
import { useDatos } from "@/hooks/useDatos";
import { fechaCorta } from "@/lib/formato";

const SERIES = [
  { clave: "animo", nombre: "Ánimo", color: "var(--chart-1)", guion: undefined },
  { clave: "estres", nombre: "Estrés", color: "var(--chart-2)", guion: "5 4" },
] as const;

const promedio = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

export function Mental() {
  const { datos: chequeos } = useDatos<Registro<DatosChequeo>[]>("/registros?tipo=chequeo&limite=60");
  const { datos: bitacoras } = useDatos<Registro<DatosBitacora>[]>("/registros?tipo=bitacora&limite=5");

  if (!chequeos || !bitacoras) return <p className="text-tinta-suave">Cargando…</p>;
  if (!chequeos.length)
    return (
      <Panel>
        <Vacio>Cuando hagas chequeos diarios, aquí verás cómo cambian tu ánimo, tu descanso y tu estrés.</Vacio>
      </Panel>
    );

  const orden = [...chequeos].sort((a, b) => a.creado.localeCompare(b.creado));
  const datos = orden.map((c) => ({ fecha: c.fecha, animo: c.datos.animo, estres: c.datos.estres, sueno: c.datos.suenoHoras }));
  const recientes = orden.slice(-7);
  const previos = orden.slice(-14, -7);
  const cifras = [
    { nombre: "Ánimo promedio", ahora: promedio(recientes.map((c) => c.datos.animo)), antes: promedio(previos.map((c) => c.datos.animo)), unidad: "de 5" },
    { nombre: "Estrés promedio", ahora: promedio(recientes.map((c) => c.datos.estres)), antes: promedio(previos.map((c) => c.datos.estres)), unidad: "de 5" },
    {
      nombre: "Sueño promedio",
      ahora: promedio(recientes.flatMap((c) => (c.datos.suenoHoras === null ? [] : [c.datos.suenoHoras]))),
      antes: promedio(previos.flatMap((c) => (c.datos.suenoHoras === null ? [] : [c.datos.suenoHoras]))),
      unidad: "h",
    },
  ];
  const frases = orden
    .filter((c) => c.datos.animoTexto)
    .slice(-4)
    .reverse();

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {cifras.map((c) => (
          <Panel key={c.nombre} className="p-4">
            <p className="text-sm text-tinta-suave">{c.nombre}</p>
            <p className="font-display text-3xl font-semibold cifra">
              {c.ahora ?? "—"} <span className="text-sm font-normal text-tinta-suave">{c.unidad}</span>
            </p>
            <p className="text-xs text-tinta-tenue">
              Últimos {recientes.length} chequeos{c.antes !== null ? ` · antes: ${c.antes} ${c.unidad}` : ""}
            </p>
          </Panel>
        ))}
      </div>

      <Panel titulo="Ánimo y estrés">
        <div className="h-60" role="img" aria-label="Ánimo y estrés por chequeo, escala de 1 a 5">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={datos} margin={{ top: 8, right: 48, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="var(--borde)" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="fecha" tickFormatter={fechaCorta} stroke="var(--tinta-tenue)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} stroke="var(--tinta-tenue)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ stroke: "var(--tinta-tenue)", strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as (typeof datos)[number];
                  return (
                    <div className="rounded-lg bg-popover px-3 py-2 text-xs shadow-xl ring-1 ring-borde">
                      <p className="mb-1 text-tinta-suave">{fechaCorta(p.fecha)}</p>
                      <p>Ánimo: {p.animo} de 5</p>
                      <p>Estrés: {p.estres} de 5</p>
                      {p.sueno !== null && <p>Sueño: {p.sueno} h</p>}
                    </div>
                  );
                }}
              />
              {SERIES.map((s) => (
                <Line
                  key={s.clave}
                  type="monotone"
                  dataKey={s.clave}
                  name={s.nombre}
                  stroke={s.color}
                  strokeWidth={2}
                  strokeDasharray={s.guion}
                  dot={{ r: 4, fill: s.color, stroke: "var(--casco)", strokeWidth: 2 }}
                  label={(props: { index?: number; x?: number | string; y?: number | string }) =>
                    props.index === datos.length - 1 ? (
                      <text x={Number(props.x ?? 0) + 8} y={Number(props.y ?? 0) + 4} fontSize={11} fill="var(--tinta-suave)">
                        {s.nombre}
                      </text>
                    ) : (
                      <g />
                    )
                  }
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <ul className="mt-3 flex gap-4 text-xs text-tinta-suave" aria-label="Leyenda">
          {SERIES.map((s) => (
            <li key={s.clave} className="flex items-center gap-1.5">
              <svg width="18" height="6" aria-hidden>
                <line x1="0" y1="3" x2="18" y2="3" stroke={s.color} strokeWidth="2" strokeDasharray={s.guion} />
              </svg>
              {s.nombre}
            </li>
          ))}
        </ul>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel titulo={<span className="flex items-center gap-2"><MessageSquareQuote className="size-4 text-acento" aria-hidden /> Lo que contaste</span>}>
          <p className="mb-3">
            <Estado nivel="info">Observaciones tuyas</Estado>
          </p>
          {frases.length || bitacoras.length ? (
            <ul className="space-y-3">
              {frases.map((c) => (
                <li key={c.id} className="border-l-2 border-acento/50 pl-3">
                  <p className="text-sm">«{c.datos.animoTexto}»</p>
                  <p className="text-xs text-tinta-tenue">Chequeo del {fechaCorta(c.fecha)}</p>
                </li>
              ))}
              {bitacoras.slice(0, 2).map((b) => (
                <li key={b.id} className="border-l-2 border-borde pl-3">
                  <p className="line-clamp-2 text-sm">«{b.datos.entrada}»</p>
                  <p className="text-xs text-tinta-tenue">Bitácora del {fechaCorta(b.fecha)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <Vacio>Aún no escribiste cómo te sientes en tus chequeos.</Vacio>
          )}
        </Panel>

        <Panel titulo={<span className="flex items-center gap-2"><Bot className="size-4 text-tinta-tenue" aria-hidden /> Interpretación del asistente</span>}>
          <p className="mb-3">
            <Estado nivel="neutro">Pendiente de IA</Estado>
          </p>
          <p className="text-sm text-tinta-suave">
            Cuando se integre el asistente, aquí verás patrones de ánimo, descanso y estrés, separados de lo que tú registraste. Las cifras de arriba son cálculos automáticos de tus chequeos.
          </p>
          <p className="mt-4 flex items-center gap-2 text-xs text-tinta-tenue">
            <Moon className="size-3.5" aria-hidden /> Si notas que el ánimo o el descanso te preocupan, habla con el responsable médico de la misión.
          </p>
        </Panel>
      </div>
    </div>
  );
}
