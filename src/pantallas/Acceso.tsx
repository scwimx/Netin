import { Archive, ArchiveRestore, ArrowLeft, Lock, MoreHorizontal, Plus, Trash2, UserRound } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type FormEvent } from "react";
import { nombreEtapa, type EtapaId, type Perfil } from "@compartido/catalogos";
import { Estado } from "@/componentes/Estado";
import { Horizonte } from "@/componentes/Horizonte";
import { ICONO_ETAPA, SelectorEtapa } from "@/componentes/SelectorEtapa";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { useSesion } from "@/hooks/useSesion";
import { api } from "@/lib/api";
import { iniciales } from "@/lib/formato";
import { cn } from "@/lib/utils";

interface PerfilPublico {
  id: string;
  nombre: string;
  rol: string;
  etapa: EtapaId;
  demo: boolean;
  archivado: boolean;
}

type Vista = { tipo: "lista" } | { tipo: "entrar"; perfil: PerfilPublico } | { tipo: "crear" };
type Gestion = { perfil: PerfilPublico; accion: "archivar" | "restaurar" | "eliminar" } | null;

export function Acceso() {
  const { entrar } = useSesion();
  const [perfiles, setPerfiles] = useState<PerfilPublico[] | null>(null);
  const [vista, setVista] = useState<Vista>({ tipo: "lista" });
  const [gestion, setGestion] = useState<Gestion>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    try {
      const lista = await api.get<PerfilPublico[]>("/perfiles");
      setPerfiles(lista);
      setError(null);
      if (!lista.length) setVista({ tipo: "crear" });
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    document.documentElement.dataset.etapa = "tierra";
    void cargar();
  }, []);

  const activos = perfiles?.filter((p) => !p.archivado) ?? [];
  const archivados = perfiles?.filter((p) => p.archivado) ?? [];

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-4 py-10">
      <Horizonte etapa={vista.tipo === "entrar" ? vista.perfil.etapa : "orbita"} />
      <div className="w-full max-w-3xl">
        <div className="mb-10 flex items-center gap-3">
          <img src="/netin.svg" alt="" className="size-10" />
          <div>
            <h1 className="font-display text-3xl font-semibold">Netin</h1>
            <p className="text-tinta-suave">Tu salud, día a día, en cualquier etapa de la misión.</p>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-critico/10 p-3 text-sm text-critico ring-1 ring-critico/30" role="alert">
            {error}
          </p>
        )}

        <AnimatePresence mode="wait">
          {vista.tipo === "lista" && perfiles && (
            <motion.section key="lista" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <h2 className="mb-4 text-xl font-semibold">¿Quién entra?</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {activos.map((p, i) => (
                  <TarjetaPerfil key={p.id} perfil={p} indice={i} alElegir={() => setVista({ tipo: "entrar", perfil: p })} alGestionar={(accion) => setGestion({ perfil: p, accion })} />
                ))}
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: activos.length * 0.05 }}
                  onClick={() => setVista({ tipo: "crear" })}
                  className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-borde text-tinta-suave transition-colors hover:border-acento hover:text-acento"
                >
                  <Plus className="size-6" aria-hidden />
                  <span className="text-sm font-medium">Crear perfil</span>
                </motion.button>
              </div>

              {archivados.length > 0 && (
                <div className="mt-8">
                  <h3 className="mb-3 text-sm font-medium text-tinta-suave">Archivados</h3>
                  <ul className="divide-y divide-borde/60 rounded-xl bg-casco/60 ring-1 ring-borde/60">
                    {archivados.map((p) => (
                      <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                        <span className="flex size-8 items-center justify-center rounded-full bg-casco-alto text-xs text-tinta-suave">{iniciales(p.nombre)}</span>
                        <span className="flex-1 text-sm">{p.nombre}</span>
                        <Button size="sm" variant="ghost" onClick={() => setGestion({ perfil: p, accion: "restaurar" })}>
                          <ArchiveRestore className="size-4" /> Restaurar
                        </Button>
                        <Button size="sm" variant="ghost" className="text-critico hover:text-critico" onClick={() => setGestion({ perfil: p, accion: "eliminar" })}>
                          <Trash2 className="size-4" /> Eliminar
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.section>
          )}

          {vista.tipo === "entrar" && (
            <FormEntrar key="entrar" perfil={vista.perfil} alVolver={() => setVista({ tipo: "lista" })} alEntrar={entrar} />
          )}

          {vista.tipo === "crear" && (
            <FormCrear key="crear" puedeVolver={activos.length + archivados.length > 0} alVolver={() => setVista({ tipo: "lista" })} alCrear={entrar} />
          )}
        </AnimatePresence>
      </div>

      <DialogoGestion
        gestion={gestion}
        alCerrar={() => setGestion(null)}
        alTerminar={async () => {
          setGestion(null);
          await cargar();
        }}
      />
    </div>
  );
}

function TarjetaPerfil({
  perfil,
  indice,
  alElegir,
  alGestionar,
}: {
  perfil: PerfilPublico;
  indice: number;
  alElegir: () => void;
  alGestionar: (a: "archivar" | "eliminar") => void;
}) {
  const [menu, setMenu] = useState(false);
  const Icono = ICONO_ETAPA[perfil.etapa];
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: indice * 0.05 }} className="group relative">
      <button
        onClick={alElegir}
        className="flex w-full flex-col items-start gap-3 rounded-xl bg-casco/80 p-4 text-left ring-1 ring-inset ring-borde transition-all hover:-translate-y-0.5 hover:ring-acento/60"
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-acento-suave font-display text-lg font-semibold text-acento ring-1 ring-acento/30">
          {iniciales(perfil.nombre)}
        </span>
        <span>
          <span className="block font-medium">{perfil.nombre}</span>
          <span className="block text-sm text-tinta-suave">{perfil.rol || "Tripulación"}</span>
        </span>
        <span className="flex flex-wrap gap-1.5">
          <Estado nivel="info" icono={Icono}>
            {nombreEtapa(perfil.etapa)}
          </Estado>
          {perfil.demo && <Estado nivel="neutro">Datos ficticios</Estado>}
        </span>
      </button>
      <button
        onClick={() => setMenu((m) => !m)}
        aria-label={`Opciones de ${perfil.nombre}`}
        aria-expanded={menu}
        className="absolute right-2 top-2 rounded-md p-1.5 text-tinta-tenue hover:bg-casco-alto hover:text-tinta"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {menu && (
        <div className="absolute right-2 top-10 z-10 w-40 rounded-lg bg-popover p-1 shadow-xl ring-1 ring-borde" onMouseLeave={() => setMenu(false)}>
          <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-casco-alto" onClick={() => (setMenu(false), alGestionar("archivar"))}>
            <Archive className="size-4" /> Archivar
          </button>
          <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-critico hover:bg-casco-alto" onClick={() => (setMenu(false), alGestionar("eliminar"))}>
            <Trash2 className="size-4" /> Eliminar
          </button>
        </div>
      )}
    </motion.div>
  );
}

function FormEntrar({ perfil, alVolver, alEntrar }: { perfil: PerfilPublico; alVolver: () => void; alEntrar: (p: Perfil) => void }) {
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      alEntrar(await api.post<Perfil>("/sesion", { perfilId: perfil.id, clave }));
    } catch (err) {
      setError((err as Error).message);
      setClave("");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <motion.form
      onSubmit={enviar}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="mx-auto max-w-sm rounded-2xl bg-casco/85 p-6 ring-1 ring-borde backdrop-blur"
    >
      <button type="button" onClick={alVolver} className="mb-5 inline-flex items-center gap-1.5 text-sm text-tinta-suave hover:text-tinta">
        <ArrowLeft className="size-4" /> Cambiar de perfil
      </button>
      <div className="mb-6 flex items-center gap-3">
        <span className="flex size-14 items-center justify-center rounded-full bg-acento-suave font-display text-xl font-semibold text-acento ring-1 ring-acento/30">
          {iniciales(perfil.nombre)}
        </span>
        <div>
          <p className="font-display text-xl font-semibold">{perfil.nombre}</p>
          <p className="text-sm text-tinta-suave">{perfil.rol || "Tripulación"}</p>
        </div>
      </div>
      <Label htmlFor="clave">Contraseña</Label>
      <div className="relative mt-2">
        <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tinta-tenue" aria-hidden />
        <Input id="clave" type="password" autoFocus autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} className="pl-9" />
      </div>
      {error && (
        <motion.p initial={{ x: -6 }} animate={{ x: [6, -4, 2, 0] }} className="mt-2 text-sm text-critico" role="alert">
          {error}
        </motion.p>
      )}
      <Button type="submit" className="mt-5 w-full" disabled={!clave || enviando}>
        Entrar
      </Button>
    </motion.form>
  );
}

function FormCrear({ puedeVolver, alVolver, alCrear }: { puedeVolver: boolean; alVolver: () => void; alCrear: (p: Perfil) => void }) {
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState("");
  const [clave, setClave] = useState("");
  const [repetir, setRepetir] = useState("");
  const [etapa, setEtapa] = useState<EtapaId>("tierra");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const coinciden = !repetir || clave === repetir;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (clave !== repetir) return setError("Las contraseñas no coinciden.");
    setEnviando(true);
    setError(null);
    try {
      alCrear(await api.post<Perfil>("/perfiles", { nombre, rol, clave, etapa }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <motion.form
      onSubmit={enviar}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="mx-auto max-w-lg space-y-4 rounded-2xl bg-casco/85 p-6 ring-1 ring-borde backdrop-blur"
    >
      {puedeVolver && (
        <button type="button" onClick={alVolver} className="inline-flex items-center gap-1.5 text-sm text-tinta-suave hover:text-tinta">
          <ArrowLeft className="size-4" /> Volver a los perfiles
        </button>
      )}
      <div className="flex items-center gap-2">
        <UserRound className="size-5 text-acento" aria-hidden />
        <h2 className="text-xl font-semibold">Crear perfil</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rol">Rol en la misión</Label>
          <Input id="rol" value={rol} onChange={(e) => setRol(e.target.value)} maxLength={60} placeholder="Ej.: Especialista de misión" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nueva-clave">Contraseña</Label>
          <Input id="nueva-clave" type="password" autoComplete="new-password" value={clave} onChange={(e) => setClave(e.target.value)} required />
          <p className={cn("text-xs", clave.length >= 8 ? "text-bien" : "text-tinta-tenue")}>Al menos 8 caracteres</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="repetir">Repite la contraseña</Label>
          <Input id="repetir" type="password" autoComplete="new-password" value={repetir} onChange={(e) => setRepetir(e.target.value)} required aria-invalid={!coinciden} />
          {!coinciden && <p className="text-xs text-critico">No coincide</p>}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Etapa actual</p>
        <SelectorEtapa valor={etapa} alCambiar={setEtapa} />
      </div>
      {error && (
        <p className="text-sm text-critico" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={!nombre.trim() || clave.length < 8 || !coinciden || enviando}>
        Crear y entrar
      </Button>
    </motion.form>
  );
}

function DialogoGestion({ gestion, alCerrar, alTerminar }: { gestion: Gestion; alCerrar: () => void; alTerminar: () => void }) {
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  useEffect(() => {
    setClave("");
    setError(null);
  }, [gestion]);
  if (!gestion) return null;

  const textos = {
    archivar: { titulo: "Archivar perfil", desc: "El perfil deja de aparecer en la lista y no se puede usar hasta restaurarlo. Sus datos se conservan.", boton: "Archivar" },
    restaurar: { titulo: "Restaurar perfil", desc: "El perfil vuelve a la lista con todos sus datos.", boton: "Restaurar" },
    eliminar: { titulo: "Eliminar perfil", desc: "Se borran el perfil, sus registros, fotos y conversaciones. No se puede deshacer.", boton: "Eliminar para siempre" },
  }[gestion.accion];

  const confirmar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await api.post(`/perfiles/${gestion.perfil.id}/${gestion.accion}`, { clave });
      alTerminar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && alCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {textos.titulo}: {gestion.perfil.nombre}
          </DialogTitle>
          <DialogDescription>{textos.desc}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="clave-gestion">Contraseña de este perfil</Label>
          <Input id="clave-gestion" type="password" autoFocus value={clave} onChange={(e) => setClave(e.target.value)} />
          {error && <p className="text-sm text-critico">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button variant={gestion.accion === "eliminar" ? "destructive" : "default"} disabled={!clave || enviando} onClick={confirmar}>
            {textos.boton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
