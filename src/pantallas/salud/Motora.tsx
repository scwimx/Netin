import { Play } from "lucide-react";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { nombreEtapa, type DatosMotora, type Registro } from "@compartido/catalogos";
import { Estado, Origen } from "@/componentes/Estado";
import { Panel, Vacio } from "@/componentes/Panel";
import { PruebaReaccion, type ResultadoReaccion } from "@/componentes/PruebaReaccion";
import { Button } from "@/componentes/ui/button";
import { useDatos } from "@/hooks/useDatos";
import { api } from "@/lib/api";
import { fechaHora } from "@/lib/formato";

interface Comparacion {
  pruebas: number;
  ultima: number | null;
  promedioPrevio: number | null;
  frenteAnterior: number | null;
  texto: string;
}

export function Motora() {
  const { datos: pruebas, recargar } = useDatos<Registro<DatosMotora>[]>("/registros?tipo=motora&limite=100");
  const { datos: comp, recargar: recargarComp } = useDatos<Comparacion>("/motora/comparacion");
  const [probando, setProbando] = useState(false);

  const guardar = async (r: ResultadoReaccion) => {
    await api.post("/registros", { tipo: "motora", datos: { prueba: "reaccion_visual", ...r } });
    setProbando(false);
    await Promise.all([recargar(), recargarComp()]);
  };

  if (!pruebas || !comp) return <p className="text-tinta-suave">Cargando…</p>;
  const serie = [...pruebas].sort((a, b) => a.creado.localeCompare(b.creado)).map((p) => ({ t: p.creado, mediana: p.datos.mediana, mejor: p.datos.mejor, etapa: p.etapa }));

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Panel titulo="Reacción visual">
          {comp.ultima !== null ? (
            <div className="space-y-3">
              <p className="font-display text-5xl font-semibold cifra">
                {comp.ultima}
                <span className="ml-1 text-lg font-normal text-tinta-suave">ms</span>
              </p>
              <p className="text-sm text-tinta-suave">Mediana de la última prueba · {comp.pruebas} pruebas en total</p>
              {comp.frenteAnterior !== null && comp.frenteAnterior !== 0 && (
                <Estado nivel="info">{`${Math.abs(comp.frenteAnterior)} ms ${comp.frenteAnterior < 0 ? "más rápida" : "más lenta"} que la anterior`}</Estado>
              )}
            </div>
          ) : (
            <Vacio>Todavía no hay pruebas.</Vacio>
          )}
          <Button className="mt-5 w-full" onClick={() => setProbando((p) => !p)} variant={probando ? "outline" : "default"}>
            {probando ? "Cancelar" : (
              <>
                <Play className="size-4" /> Hacer una prueba
              </>
            )}
          </Button>
        </Panel>

        <Panel titulo="Resumen">
          <div className="space-y-3">
            <Origen origen="automatico" />
            <p className="leading-relaxed">{comp.texto}</p>
            <p className="text-xs text-tinta-tenue">Compara tus propios resultados entre sí. El resumen del asistente llegará cuando la IA esté integrada.</p>
          </div>
        </Panel>
      </div>

      {probando && (
        <Panel>
          <PruebaReaccion alTerminar={guardar} />
        </Panel>
      )}

      {serie.length > 1 && (
        <Panel titulo="Evolución de la mediana">
          <div className="h-56" role="img" aria-label="Mediana de reacción por prueba, en milisegundos">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serie} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                <CartesianGrid stroke="var(--borde)" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="t" tickFormatter={(t) => new Date(t).toLocaleDateString("es", { day: "numeric", month: "short" })} stroke="var(--tinta-tenue)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis stroke="var(--tinta-tenue)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} unit=" ms" width={60} />
                {comp.promedioPrevio && <ReferenceLine y={comp.promedioPrevio} stroke="var(--tinta-tenue)" strokeDasharray="4 4" label={{ value: "promedio previo", fill: "var(--tinta-tenue)", fontSize: 11, position: "insideTopRight" }} />}
                <Tooltip
                  cursor={{ stroke: "var(--tinta-tenue)", strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as (typeof serie)[number];
                    return (
                      <div className="rounded-lg bg-popover px-3 py-2 text-xs shadow-xl ring-1 ring-borde">
                        <p className="font-display text-base cifra">{p.mediana} ms</p>
                        <p className="text-tinta-suave">Mejor intento: {p.mejor} ms</p>
                        <p className="text-tinta-suave">
                          {fechaHora(p.t)} · {nombreEtapa(p.etapa)}
                        </p>
                      </div>
                    );
                  }}
                />
                <Line type="monotone" dataKey="mediana" stroke="var(--acento)" strokeWidth={2} dot={{ r: 4, fill: "var(--acento)", stroke: "var(--casco)", strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}

      {pruebas.length > 0 && (
        <Panel titulo="Pruebas medidas">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-tinta-suave">
                <tr>
                  <th className="py-2 pr-3 font-medium">Cuándo</th>
                  <th className="py-2 pr-3 font-medium">Etapa</th>
                  <th className="py-2 pr-3 font-medium">Mediana</th>
                  <th className="py-2 pr-3 font-medium">Mejor</th>
                  <th className="py-2 font-medium">Anticipos</th>
                </tr>
              </thead>
              <tbody>
                {pruebas.slice(0, 10).map((p) => (
                  <tr key={p.id} className="border-t border-borde/60">
                    <td className="py-2 pr-3">{fechaHora(p.creado)}</td>
                    <td className="py-2 pr-3">{nombreEtapa(p.etapa)}</td>
                    <td className="cifra py-2 pr-3">{p.datos.mediana} ms</td>
                    <td className="cifra py-2 pr-3">{p.datos.mejor} ms</td>
                    <td className="cifra py-2">{p.datos.anticipos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
