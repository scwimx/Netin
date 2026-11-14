import { ArrowRight, BookOpen, CameraOff, ClipboardCheck, Timer, UserRound } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import {
  INDICADORES,
  nombreEtapa,
  type DatosBitacora,
  type DatosChequeo,
  type DatosFoto,
  type DatosVital,
  type Registro,
} from "@compartido/catalogos";
import { Estado, Origen } from "@/componentes/Estado";
import { GraficaTendencia } from "@/componentes/GraficaTendencia";
import { Panel, Vacio } from "@/componentes/Panel";
import { ICONO_ETAPA } from "@/componentes/SelectorEtapa";
import { Button } from "@/componentes/ui/button";
import { useDatos } from "@/hooks/useDatos";
import { usePerfil, useSesion } from "@/hooks/useSesion";
import { edad, fechaCorta, fechaHora, fechaLarga, haceCuanto, saludo } from "@/lib/formato";
import { calcularPendientes } from "@/lib/pendientes";

export function Inicio() {
  const perfil = usePerfil();
  const { dia } = useSesion();
  const { datos: registros } = useDatos<Registro[]>("/registros?limite=1000");
  const { datos: motora } = useDatos<{ texto: string; pruebas: number }>("/motora/comparacion");

  if (!registros || !dia) return <p className="text-tinta-suave">Cargando…</p>;

  const foto = registros.find((r) => r.tipo === "foto") as Registro<DatosFoto> | undefined;
  const fotoReciente = registros.find((r) => r.tipo === "foto" && !r.datos.omitida) as Registro<DatosFoto> | undefined;
  const chequeo = registros.find((r) => r.tipo === "chequeo") as Registro<DatosChequeo> | undefined;
  const bitacora = registros.find((r) => r.tipo === "bitacora") as Registro<DatosBitacora> | undefined;
  const vitales = registros.filter((r) => r.tipo === "vital") as Registro<DatosVital>[];
  const pendientes = calcularPendientes(registros, dia);
  const siguiente = pendientes[0];
  const IconoEtapa = ICONO_ETAPA[perfil.etapa];
  const anios = edad(perfil.nacimiento);

  const ultimos = INDICADORES.map((i) => vitales.find((v) => v.datos.indicador === i.id)).filter(Boolean) as Registro<DatosVital>[];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-tinta-suave">{fechaLarga(dia.fecha)}</p>
          <h1 className="text-2xl font-semibold sm:text-3xl">
            {saludo()}, {perfil.ajustes.comoLlamarte || perfil.nombre.split(" ")[0]}
          </h1>
        </div>
        {perfil.demo && <Estado nivel="neutro">Perfil con datos ficticios</Estado>}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        {/* Astronauta */}
        <Panel className="flex flex-col gap-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-casco-alto">
            {fotoReciente ? (
              <img src={`/api/fotos/${fotoReciente.fecha}`} alt={`Foto de ${perfil.nombre} del ${fechaCorta(fotoReciente.fecha)}`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-tinta-tenue">
                <UserRound className="size-12" aria-hidden />
                <span className="text-sm">Sin foto todavía</span>
              </div>
            )}
            {foto && (
              <span className="absolute bottom-2 left-2">
                {foto.datos.omitida ? (
                  <Estado nivel="neutro" icono={CameraOff}>
                    Sin foto hoy
                  </Estado>
                ) : (
                  <Estado nivel="bien">{foto.fecha === dia.fecha ? "Foto de hoy" : `Foto del ${fechaCorta(foto.fecha)}`}</Estado>
                )}
              </span>
            )}
          </div>
          <div>
            <p className="font-display text-xl font-semibold">{perfil.nombre}</p>
            <p className="text-sm text-tinta-suave">
              {[perfil.rol || "Tripulación", anios !== null && `${anios} años`].filter(Boolean).join(" · ")}
            </p>
          </div>
          <Estado nivel="info" icono={IconoEtapa} className="self-start">
            Etapa: {nombreEtapa(perfil.etapa)}
          </Estado>
        </Panel>

        <div className="flex flex-col gap-5">
          {/* Siguiente paso */}
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <Panel className="relative overflow-hidden ring-acento/40">
              <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-acento/15 blur-2xl" aria-hidden />
              <p className="mb-1 text-sm text-tinta-suave">Siguiente paso</p>
              {siguiente ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1.5">
                    <p className="font-display text-lg font-semibold">{siguiente.titulo}</p>
                    <p className="text-sm text-tinta-suave">{siguiente.respaldo}</p>
                  </div>
                  {siguiente.accion && (
                    <Button asChild>
                      <Link to={siguiente.accion.a}>
                        {siguiente.accion.texto} <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <p className="font-display text-lg font-semibold">Todo al día. No hay pendientes en tus registros.</p>
              )}
            </Panel>
          </motion.div>

          {/* Riesgos y pendientes */}
          {pendientes.length > 1 && (
            <Panel titulo="Para tener en cuenta">
              <ul className="space-y-3">
                {pendientes.slice(1, 6).map((p) => (
                  <li key={p.id} className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <Estado nivel={p.nivel}>{p.titulo}</Estado>
                      <p className="pl-1 text-xs text-tinta-tenue">{p.respaldo}</p>
                    </div>
                    {p.accion && (
                      <Link to={p.accion.a} className="text-sm text-acento hover:underline">
                        {p.accion.texto}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {/* Indicadores */}
          <Panel titulo="Últimas mediciones" accion={<Link to="/salud" className="text-sm text-acento hover:underline">Ver salud</Link>}>
            {ultimos.length ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {ultimos.map((v) => {
                  const ind = INDICADORES.find((i) => i.id === v.datos.indicador)!;
                  return (
                    <li key={v.id} className="rounded-xl bg-casco-alto/60 p-3">
                      <p className="text-xs text-tinta-suave">{ind.nombre}</p>
                      <p className="font-display text-2xl font-semibold cifra">
                        {v.datos.valor2 !== undefined ? `${v.datos.valor}/${v.datos.valor2}` : v.datos.valor}
                        <span className="ml-1 text-sm font-normal text-tinta-suave">{ind.unidad}</span>
                      </p>
                      <p className="mb-1.5 text-xs text-tinta-tenue" title={fechaHora(v.datos.medidoEn)}>
                        {haceCuanto(v.datos.medidoEn)}
                      </p>
                      <Origen origen={v.datos.origen} />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Vacio accion={<Button asChild variant="outline" size="sm"><Link to="/salud">Agregar medición</Link></Button>}>
                Aún no hay mediciones.
              </Vacio>
            )}
          </Panel>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel titulo="Tendencias" className="lg:col-span-2">
          <GraficaTendencia vitales={vitales} />
        </Panel>

        <div className="flex flex-col gap-5">
          <Panel titulo={<span className="flex items-center gap-2"><ClipboardCheck className="size-4 text-acento" aria-hidden /> Último chequeo</span>}>
            {chequeo ? (
              <div className="space-y-2">
                <p className="text-xs text-tinta-tenue">{fechaCorta(chequeo.fecha)}</p>
                <p className="text-sm leading-relaxed">{chequeo.datos.resumen.texto}</p>
                <Origen origen={chequeo.datos.resumen.origen} />
              </div>
            ) : (
              <Vacio>Todavía no hay chequeos.</Vacio>
            )}
          </Panel>
          <Panel titulo={<span className="flex items-center gap-2"><BookOpen className="size-4 text-acento" aria-hidden /> Bitácora</span>}>
            {bitacora ? (
              <div className="space-y-2">
                <p className="text-xs text-tinta-tenue">{fechaCorta(bitacora.fecha)}</p>
                <p className="line-clamp-4 whitespace-pre-line text-sm leading-relaxed">{bitacora.datos.entrada}</p>
              </div>
            ) : (
              <Vacio>Todavía no hay entradas.</Vacio>
            )}
          </Panel>
          <Panel titulo={<span className="flex items-center gap-2"><Timer className="size-4 text-acento" aria-hidden /> Reacción visual</span>}>
            <p className="text-sm leading-relaxed">{motora?.texto ?? "…"}</p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
