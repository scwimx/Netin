import { ChevronDown, FileQuestion, FlaskConical, Plus, Satellite, Upload } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { INDICADORES, nombreEtapa, type DatosVital, type IndicadorId, type Registro } from "@compartido/catalogos";
import { Estado, Origen } from "@/componentes/Estado";
import { GraficaTendencia } from "@/componentes/GraficaTendencia";
import { Panel, Vacio } from "@/componentes/Panel";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Switch } from "@/componentes/ui/switch";
import { Textarea } from "@/componentes/ui/textarea";
import { useDatos } from "@/hooks/useDatos";
import { usePerfil, useSesion } from "@/hooks/useSesion";
import { api } from "@/lib/api";
import { fechaHora, haceCuanto } from "@/lib/formato";
import { calcularPendientes } from "@/lib/pendientes";
import { cn } from "@/lib/utils";

export function General() {
  const perfil = usePerfil();
  const { dia } = useSesion();
  const { datos: registros, recargar } = useDatos<Registro[]>("/registros?limite=1000");
  const [agregar, setAgregar] = useState(false);
  const [importar, setImportar] = useState(false);
  const [abierto, setAbierto] = useState<IndicadorId | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  if (!registros) return <p className="text-tinta-suave">Cargando…</p>;
  const vitales = registros.filter((r) => r.tipo === "vital") as Registro<DatosVital>[];
  const riesgos = calcularPendientes(registros, dia).filter((p) => p.id !== "dia");

  const simular = async () => {
    await api.post("/vitales/simular");
    setAviso("Se agregaron mediciones simuladas. Están marcadas como «Simulada».");
    await recargar();
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel
          titulo="Vitales"
          accion={
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" onClick={() => setAgregar(true)}>
                <Plus className="size-4" /> Medición
              </Button>
              <Button size="sm" variant="outline" onClick={() => setImportar(true)}>
                <Upload className="size-4" /> Importar
              </Button>
              <Button size="sm" variant="ghost" onClick={simular} title="Genera valores de demostración marcados como simulados">
                <FlaskConical className="size-4" /> Simular
              </Button>
            </div>
          }
        >
          {aviso && <p className="mb-3 text-sm text-tinta-suave">{aviso}</p>}
          <ul className="divide-y divide-borde/60">
            {INDICADORES.map((ind) => {
              const ultimo = vitales.find((v) => v.datos.indicador === ind.id);
              const expandido = abierto === ind.id;
              return (
                <li key={ind.id}>
                  <button
                    onClick={() => setAbierto(expandido ? null : ind.id)}
                    aria-expanded={expandido}
                    className="flex w-full items-center gap-3 py-3 text-left"
                  >
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{ind.nombre}</span>
                      <span className="block text-xs text-tinta-tenue">{ultimo ? `${fechaHora(ultimo.datos.medidoEn)} · ${haceCuanto(ultimo.datos.medidoEn)}` : "Sin mediciones"}</span>
                    </span>
                    {ultimo && (
                      <>
                        <span className="hidden sm:block">
                          <Origen origen={ultimo.datos.origen} />
                        </span>
                        <span className="font-display text-xl font-semibold cifra">
                          {ultimo.datos.valor2 !== undefined ? `${ultimo.datos.valor}/${ultimo.datos.valor2}` : ultimo.datos.valor}
                          <span className="ml-1 text-xs font-normal text-tinta-suave">{ind.unidad}</span>
                        </span>
                      </>
                    )}
                    <ChevronDown className={cn("size-4 text-tinta-tenue transition-transform", expandido && "rotate-180")} aria-hidden />
                  </button>
                  <AnimatePresence initial={false}>
                    {expandido && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <GuiaIndicador etapa={nombreEtapa(perfil.etapa)} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </Panel>

        <div className="flex flex-col gap-5">
          <Panel titulo="Riesgos y precauciones">
            {riesgos.length ? (
              <ul className="space-y-3">
                {riesgos.map((r) => (
                  <li key={r.id} className="space-y-1">
                    <Estado nivel={r.nivel}>{r.titulo}</Estado>
                    <p className="pl-1 text-xs text-tinta-tenue">{r.respaldo}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <Vacio>Tus registros no muestran riesgos ni pendientes.</Vacio>
            )}
            <p className="mt-4 border-t border-borde/60 pt-3 text-xs text-tinta-tenue">
              Esta lista sale solo de lo que registraste. Las precauciones e indicaciones con respaldo llegarán con los documentos de la misión.
            </p>
          </Panel>

          <Panel>
            <div className="flex items-start gap-3">
              <Satellite className="mt-0.5 size-5 text-tinta-tenue" aria-hidden />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="archer" className="text-base font-semibold">
                    ARCHeR
                  </Label>
                  <Switch id="archer" disabled checked={false} aria-describedby="archer-desc" />
                </div>
                <Estado nivel="neutro">Integración futura</Estado>
                <p id="archer-desc" className="pt-1 text-sm text-tinta-suave">
                  La conexión con ARCHeR todavía no está disponible. El control queda aquí para cuando se integre.
                </p>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <Panel titulo="Tendencias">
        <GraficaTendencia vitales={vitales} alto={260} />
      </Panel>

      <DialogoMedicion abierto={agregar} alCerrar={() => setAgregar(false)} alGuardar={recargar} />
      <DialogoImportar abierto={importar} alCerrar={() => setImportar(false)} alGuardar={recargar} />
    </div>
  );
}

/** Guía por indicador. Sin documentos no se inventa contenido: se muestra qué falta. */
function GuiaIndicador({ etapa }: { etapa: string }) {
  const partes = [
    `Cómo medirlo en ${etapa}`,
    "Qué permite observar",
    "Qué puedes hacer para prevenir",
    "Cuándo avisar a la tripulación o al equipo médico en Tierra",
  ];
  return (
    <div className="mb-3 rounded-xl bg-casco-alto/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <FileQuestion className="size-4 text-tinta-tenue" aria-hidden />
        <Estado nivel="neutro">Sin documento de respaldo</Estado>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {partes.map((p) => (
          <li key={p} className="rounded-lg border border-dashed border-borde p-3">
            <p className="text-sm font-medium">{p}</p>
            <p className="text-xs text-tinta-tenue">Pendiente: se completará con los documentos de la misión (documento y página).</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-tinta-suave">
        Mientras tanto, ante cualquier duda consulta al responsable médico de la misión. <Link to="/documentos" className="text-acento hover:underline">Ver documentos</Link>
      </p>
    </div>
  );
}

function ahoraLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function DialogoMedicion({ abierto, alCerrar, alGuardar }: { abierto: boolean; alCerrar: () => void; alGuardar: () => void }) {
  const [indicador, setIndicador] = useState<IndicadorId>("fc");
  const [valor, setValor] = useState("");
  const [valor2, setValor2] = useState("");
  const [cuando, setCuando] = useState(ahoraLocal);
  const [error, setError] = useState<string | null>(null);
  const ind = INDICADORES.find((i) => i.id === indicador)!;

  const guardar = async () => {
    setError(null);
    try {
      await api.post("/registros", {
        tipo: "vital",
        datos: { indicador, valor, ...(ind.dos ? { valor2 } : {}), origen: "manual", medidoEn: new Date(cuando).toISOString() },
      });
      setValor("");
      setValor2("");
      alGuardar();
      alCerrar();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && alCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar medición</DialogTitle>
          <DialogDescription>Se guarda como medición manual con la etapa actual.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {INDICADORES.map((i) => (
              <button
                key={i.id}
                onClick={() => setIndicador(i.id)}
                className={cn("rounded-full px-3 py-1 text-sm", i.id === indicador ? "bg-acento text-acento-tinta" : "bg-casco-alto text-tinta-suave")}
              >
                {i.nombre}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="valor">{ind.dos ? "Sistólica" : "Valor"} ({ind.unidad})</Label>
              <Input id="valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} autoFocus />
            </div>
            {ind.dos && (
              <div className="flex-1 space-y-2">
                <Label htmlFor="valor2">Diastólica ({ind.unidad})</Label>
                <Input id="valor2" inputMode="decimal" value={valor2} onChange={(e) => setValor2(e.target.value)} />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cuando">¿Cuándo se midió?</Label>
            <Input id="cuando" type="datetime-local" value={cuando} onChange={(e) => setCuando(e.target.value)} />
          </div>
          {error && <p className="text-sm text-critico">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={!valor || (ind.dos && !valor2)}>
            Guardar medición
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogoImportar({ abierto, alCerrar, alGuardar }: { abierto: boolean; alCerrar: () => void; alGuardar: () => void }) {
  const [csv, setCsv] = useState("");
  const [resultado, setResultado] = useState<{ importadas: number; errores: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const leerArchivo = async (f: File | undefined) => f && setCsv(await f.text());
  const importar = async () => {
    setError(null);
    try {
      const r = await api.post<{ importadas: number; errores: string[] }>("/vitales/importar", { csv });
      setResultado(r);
      alGuardar();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const cerrar = () => {
    alCerrar();
    setResultado(null);
    setCsv("");
  };

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar mediciones</DialogTitle>
          <DialogDescription>Archivo CSV con columnas fecha_hora, indicador, valor y, para presión, valor2. Indicadores: {INDICADORES.map((i) => i.id).join(", ")}.</DialogDescription>
        </DialogHeader>
        {resultado ? (
          <div className="space-y-2">
            <Estado nivel={resultado.importadas ? "bien" : "aviso"}>{resultado.importadas} mediciones importadas</Estado>
            {resultado.errores.length > 0 && (
              <ul className="max-h-32 overflow-auto text-xs text-tinta-suave">
                {resultado.errores.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
            <DialogFooter>
              <Button onClick={cerrar}>Listo</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <Input type="file" accept=".csv,text/csv,text/plain" onChange={(e) => void leerArchivo(e.target.files?.[0])} />
            <Textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={6} placeholder={"fecha_hora,indicador,valor,valor2\n2026-11-14T08:00,fc,62\n2026-11-14T08:00,pa,118,76"} className="font-mono text-xs" />
            {error && <p className="text-sm text-critico">{error}</p>}
            <DialogFooter>
              <Button variant="ghost" onClick={cerrar}>
                Cancelar
              </Button>
              <Button onClick={importar} disabled={!csv.trim()}>
                Importar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
