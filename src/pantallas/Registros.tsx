import { History, Pencil, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  INICIOS,
  INTENSIDADES,
  MANIFESTACIONES,
  nombreEtapa,
  TIPOS_REGISTRO,
  ZONAS,
  type Registro,
  type TipoRegistro,
} from "@compartido/catalogos";
import { Estado, Origen } from "@/componentes/Estado";
import { Encabezado, Panel, Vacio } from "@/componentes/Panel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/componentes/ui/alert-dialog";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Textarea } from "@/componentes/ui/textarea";
import { useDatos } from "@/hooks/useDatos";
import { useSesion } from "@/hooks/useSesion";
import { api } from "@/lib/api";
import { describir, ICONO_TIPO } from "@/lib/describir";
import { fechaHora, fechaLarga, hora } from "@/lib/formato";
import { cn } from "@/lib/utils";

export function Registros() {
  const [params, setParams] = useSearchParams();
  const tipos = (params.get("tipo") ?? "").split(",").filter(Boolean) as TipoRegistro[];
  const desde = params.get("desde") ?? "";
  const hasta = params.get("hasta") ?? "";
  const consulta = new URLSearchParams({ limite: "1000", ...(tipos.length ? { tipo: tipos.join(",") } : {}), ...(desde ? { desde } : {}), ...(hasta ? { hasta } : {}) });
  const { datos, recargar, cargando } = useDatos<Registro[]>(`/registros?${consulta}`);
  const [abierto, setAbierto] = useState<Registro | null>(null);

  const poner = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    setParams(p, { replace: true });
  };
  const alternarTipo = (t: TipoRegistro) => poner("tipo", (tipos.includes(t) ? tipos.filter((x) => x !== t) : [...tipos, t]).join(","));

  const grupos = useMemo(() => {
    const m = new Map<string, Registro[]>();
    for (const r of datos ?? []) m.set(r.fecha, [...(m.get(r.fecha) ?? []), r]);
    return [...m.entries()];
  }, [datos]);

  return (
    <div>
      <Encabezado titulo="Registros" descripcion="Todo lo que guardaste, por fecha. Puedes corregir o eliminar cualquier reporte." />

      <Panel className="mb-5 space-y-4 p-4">
        <div className="flex flex-wrap gap-1.5" aria-label="Filtrar por tipo">
          {TIPOS_REGISTRO.map((t) => {
            const Icono = ICONO_TIPO[t.id];
            const activo = tipos.includes(t.id);
            return (
              <button
                key={t.id}
                onClick={() => alternarTipo(t.id)}
                aria-pressed={activo}
                className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors", activo ? "bg-acento text-acento-tinta" : "bg-casco-alto text-tinta-suave hover:text-tinta")}
              >
                <Icono className="size-3.5" aria-hidden /> {t.nombre}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="desde" className="text-xs text-tinta-suave">
              Desde
            </Label>
            <Input id="desde" type="date" value={desde} onChange={(e) => poner("desde", e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="hasta" className="text-xs text-tinta-suave">
              Hasta
            </Label>
            <Input id="hasta" type="date" value={hasta} onChange={(e) => poner("hasta", e.target.value)} className="w-40" />
          </div>
          {(tipos.length > 0 || desde || hasta) && (
            <Button variant="ghost" size="sm" onClick={() => setParams({}, { replace: true })}>
              <X className="size-4" /> Quitar filtros
            </Button>
          )}
          <span className="ml-auto text-sm text-tinta-tenue">{datos ? `${datos.length} registros` : ""}</span>
        </div>
      </Panel>

      {datos && !datos.length && !cargando && (
        <Panel>
          <Vacio>No hay registros con estos filtros.</Vacio>
        </Panel>
      )}

      <div className="space-y-6">
        {grupos.map(([fecha, lista]) => (
          <section key={fecha}>
            <h2 className="sticky top-14 z-10 mb-2 bg-vacio/80 py-1 text-sm font-medium text-tinta-suave backdrop-blur">{fechaLarga(fecha)}</h2>
            <ul className="relative space-y-2 border-l border-borde/70 pl-5">
              {lista.map((r) => {
                const Icono = ICONO_TIPO[r.tipo];
                const { titulo, detalle } = describir(r);
                return (
                  <li key={r.id} className="relative">
                    <span className="absolute -left-[29px] top-3.5 flex size-4 items-center justify-center rounded-full bg-vacio ring-1 ring-borde">
                      <span className={cn("size-1.5 rounded-full", r.tipo === "aviso" ? "bg-critico" : "bg-acento")} />
                    </span>
                    <button onClick={() => setAbierto(r)} className="flex w-full items-start gap-3 rounded-xl bg-casco/70 p-3 text-left ring-1 ring-inset ring-borde/70 transition-colors hover:ring-acento/50">
                      <Icono className="mt-0.5 size-4 shrink-0 text-acento" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{titulo}</span>
                        {detalle && <span className="line-clamp-2 block text-sm text-tinta-suave">{detalle}</span>}
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1 text-xs text-tinta-tenue">
                        <span>{hora(r.creado)}</span>
                        <span>{nombreEtapa(r.etapa)}</span>
                        {r.revisiones > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <History className="size-3" aria-hidden /> corregido
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {abierto && (
        <DetalleRegistro
          registro={abierto}
          alCerrar={() => setAbierto(null)}
          alCambiar={async (r) => {
            setAbierto(r);
            await recargar();
          }}
        />
      )}
    </div>
  );
}

function DetalleRegistro({ registro, alCerrar, alCambiar }: { registro: Registro; alCerrar: () => void; alCambiar: (r: Registro | null) => void }) {
  const { refrescarDia } = useSesion();
  const [editando, setEditando] = useState(false);
  const [borrar, setBorrar] = useState(false);
  const [verHistorial, setVerHistorial] = useState(false);
  const { datos: historial } = useDatos<{ id: string; datos: any; motivo: string; reemplazado: string }[]>(verHistorial ? `/registros/${registro.id}/revisiones` : null);
  const [error, setError] = useState<string | null>(null);
  const editable = !["foto", "motora"].includes(registro.tipo);
  const { titulo } = describir(registro);

  const eliminar = async () => {
    try {
      await api.del(`/registros/${registro.id}`);
      await refrescarDia();
      alCambiar(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && alCerrar()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <p className="text-sm text-tinta-suave">
            {fechaHora(registro.creado)} · {nombreEtapa(registro.etapa)}
            {registro.revisiones > 0 && ` · corregido ${registro.revisiones} ${registro.revisiones === 1 ? "vez" : "veces"}`}
          </p>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {editando ? (
            <motion.div key="editar" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <FormCorreccion
                registro={registro}
                alCancelar={() => setEditando(false)}
                alGuardar={(r) => {
                  setEditando(false);
                  alCambiar(r);
                }}
              />
            </motion.div>
          ) : (
            <motion.div key="ver" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <Contenido registro={registro} />
              <div className="flex flex-wrap gap-2 border-t border-borde/60 pt-4">
                {editable && (
                  <Button variant="secondary" onClick={() => setEditando(true)}>
                    <Pencil className="size-4" /> Corregir
                  </Button>
                )}
                {registro.revisiones > 0 && (
                  <Button variant="ghost" onClick={() => setVerHistorial((v) => !v)}>
                    <History className="size-4" /> {verHistorial ? "Ocultar historial" : "Ver historial"}
                  </Button>
                )}
                <Button variant="ghost" className="ml-auto text-critico hover:text-critico" onClick={() => setBorrar(true)}>
                  <Trash2 className="size-4" /> Eliminar
                </Button>
              </div>
              {!editable && registro.tipo === "motora" && <p className="text-xs text-tinta-tenue">Los resultados medidos no se corrigen. Si la prueba salió mal, elimínala y repítela.</p>}
              {verHistorial && historial && (
                <ol className="space-y-2">
                  {historial.map((h) => (
                    <li key={h.id} className="rounded-lg bg-casco-alto/50 p-3 text-sm">
                      <p className="text-xs text-tinta-tenue">
                        Versión reemplazada el {fechaHora(h.reemplazado)}
                        {h.motivo && ` · ${h.motivo}`}
                      </p>
                      <p className="mt-1 text-tinta-suave">{describir({ ...registro, datos: h.datos }).detalle || describir({ ...registro, datos: h.datos }).titulo}</p>
                    </li>
                  ))}
                </ol>
              )}
              {error && <p className="text-sm text-critico">{error}</p>}
            </motion.div>
          )}
        </AnimatePresence>

        <AlertDialog open={borrar} onOpenChange={setBorrar}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar este registro?</AlertDialogTitle>
              <AlertDialogDescription>
                Se borra «{titulo}» del {fechaLarga(registro.fecha).toLowerCase()}
                {registro.tipo === "foto" ? ", junto con la imagen" : ""}. No se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={eliminar} className="bg-critico text-white hover:bg-critico/90">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

function Contenido({ registro: r }: { registro: Registro }) {
  const d = r.datos;
  switch (r.tipo) {
    case "foto":
      return d.omitida ? <Estado nivel="neutro">Sin foto: {d.motivo}</Estado> : <img src={`/api/fotos/${r.fecha}`} alt="Foto diaria" className="w-full rounded-xl" />;
    case "chequeo":
      return (
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <Estado nivel="info">Ánimo {d.animo} de 5</Estado>
            <Estado nivel="info">Estrés {d.estres} de 5</Estado>
            <Estado nivel="info">{d.suenoHoras === null ? "Sueño sin registrar" : `Sueño ${d.suenoHoras} h`}</Estado>
          </div>
          {d.animoTexto && <p>«{d.animoTexto}»</p>}
          <div className="rounded-lg bg-casco-alto/50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Origen origen={d.resumen.origen} />
              {d.resumen.editado && <span className="text-xs text-tinta-tenue">Editado por ti</span>}
            </div>
            <p>{d.resumen.texto}</p>
          </div>
        </div>
      );
    case "bitacora":
      return (
        <div className="space-y-3">
          <p className="whitespace-pre-line leading-relaxed">{d.entrada}</p>
          <p className="text-xs text-tinta-tenue">{d.resumen ? `Resumen: ${d.resumen.texto}` : "Resumen de IA: pendiente de integración."}</p>
        </div>
      );
    case "motora":
      return (
        <div className="space-y-2 text-sm">
          <p className="font-display text-3xl cifra">{d.mediana} ms</p>
          <p className="text-tinta-suave">Intentos: {d.intentos.join(", ")} ms · anticipos: {d.anticipos}</p>
        </div>
      );
    case "vital":
      return (
        <div className="space-y-2">
          <p className="font-display text-3xl cifra">{describir(r).detalle}</p>
          <p className="text-sm text-tinta-suave">Medido: {fechaHora(d.medidoEn)}</p>
          <Origen origen={d.origen} />
        </div>
      );
    default:
      return <p className="text-sm text-tinta-suave">{describir(r).detalle}</p>;
  }
}

function FormCorreccion({ registro, alCancelar, alGuardar }: { registro: Registro; alCancelar: () => void; alGuardar: (r: Registro) => void }) {
  const [d, setD] = useState<any>(structuredClone(registro.datos));
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const poner = (k: string, v: unknown) => setD((x: any) => ({ ...x, [k]: v }));

  const guardar = async () => {
    setError(null);
    try {
      const datos = registro.tipo === "chequeo" ? { ...d, resumen: { ...d.resumen, editado: true } } : d;
      alGuardar(await api.patch<Registro>(`/registros/${registro.id}`, { datos, motivo }));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const selector = "h-9 w-full rounded-md bg-casco-alto px-3 text-sm ring-1 ring-borde";

  return (
    <div className="space-y-4">
      {registro.tipo === "sintoma" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Zona</Label>
            <select className={selector} value={d.zona} onChange={(e) => poner("zona", e.target.value)}>
              {ZONAS.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Síntoma</Label>
            <select className={selector} value={d.manifestacion} onChange={(e) => poner("manifestacion", e.target.value)}>
              {[...new Set([d.manifestacion, ...MANIFESTACIONES])].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Intensidad</Label>
            <select className={selector} value={d.intensidad} onChange={(e) => poner("intensidad", Number(e.target.value))}>
              {INTENSIDADES.map((i) => (
                <option key={i.valor} value={i.valor}>
                  {i.valor} · {i.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Inicio</Label>
            <select className={selector} value={d.inicio} onChange={(e) => poner("inicio", e.target.value)}>
              {INICIOS.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Estado</Label>
            <select className={selector} value={d.estado} onChange={(e) => poner("estado", e.target.value)}>
              <option value="activo">Activo</option>
              <option value="resuelto">Resuelto</option>
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Notas</Label>
            <Textarea value={d.notas} onChange={(e) => poner("notas", e.target.value)} rows={2} />
          </div>
        </div>
      )}
      {registro.tipo === "vital" && (
        <div className="flex gap-3">
          <div className="flex-1 space-y-1">
            <Label>Valor</Label>
            <Input inputMode="decimal" value={d.valor} onChange={(e) => poner("valor", e.target.value)} />
          </div>
          {d.valor2 !== undefined && (
            <div className="flex-1 space-y-1">
              <Label>Segundo valor</Label>
              <Input inputMode="decimal" value={d.valor2} onChange={(e) => poner("valor2", e.target.value)} />
            </div>
          )}
        </div>
      )}
      {registro.tipo === "bitacora" && <Textarea value={d.entrada} onChange={(e) => poner("entrada", e.target.value)} rows={8} />}
      {registro.tipo === "chequeo" && (
        <div className="space-y-1">
          <Label>Resumen</Label>
          <Textarea value={d.resumen.texto} onChange={(e) => poner("resumen", { ...d.resumen, texto: e.target.value })} rows={5} />
        </div>
      )}
      {registro.tipo === "aviso" && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Estado</Label>
            <select className={selector} value={d.estado} onChange={(e) => poner("estado", e.target.value)}>
              <option value="abierto">Abierto</option>
              <option value="cerrado">Cerrado</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>Detalle</Label>
            <Textarea value={d.detalle} onChange={(e) => poner("detalle", e.target.value)} rows={3} />
          </div>
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor="motivo">¿Qué corriges? (opcional)</Label>
        <Input id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={200} placeholder="Ej.: era el otro hombro" />
        <p className="text-xs text-tinta-tenue">La versión anterior queda en el historial.</p>
      </div>
      {error && <p className="text-sm text-critico">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={alCancelar}>
          Cancelar
        </Button>
        <Button onClick={guardar}>Guardar corrección</Button>
      </div>
    </div>
  );
}
