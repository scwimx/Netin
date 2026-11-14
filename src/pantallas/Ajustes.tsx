import { Archive, Camera, Database, KeyRound, LogOut, Trash2, UserRound, Users } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Estado } from "@/componentes/Estado";
import { Encabezado, Panel } from "@/componentes/Panel";
import { SelectorEtapa } from "@/componentes/SelectorEtapa";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Switch } from "@/componentes/ui/switch";
import { useDatos } from "@/hooks/useDatos";
import { usePerfil, useSesion } from "@/hooks/useSesion";
import { api } from "@/lib/api";
import { fechaHora } from "@/lib/formato";

export function Ajustes() {
  const perfil = usePerfil();
  const { refrescarPerfil, cambiarEtapa, salir } = useSesion();
  const [nombre, setNombre] = useState(perfil.nombre);
  const [rol, setRol] = useState(perfil.rol);
  const [nacimiento, setNacimiento] = useState(perfil.nacimiento ?? "");
  const [corto, setCorto] = useState(perfil.ajustes.comoLlamarte);
  const [guardado, setGuardado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [peligro, setPeligro] = useState<"archivar" | "eliminar" | null>(null);

  const guardarPerfil = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.patch("/yo", { nombre, rol, nacimiento, ajustes: { comoLlamarte: corto } });
      await refrescarPerfil();
      setGuardado("Perfil guardado.");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const ajuste = async (cambio: Record<string, unknown>) => {
    await api.patch("/yo", { ajustes: cambio });
    await refrescarPerfil();
  };

  return (
    <div className="space-y-5">
      <Encabezado titulo="Ajustes" />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel titulo={<span className="flex items-center gap-2"><UserRound className="size-4 text-acento" aria-hidden /> Perfil</span>}>
          <form onSubmit={guardarPerfil} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="a-nombre">Nombre</Label>
                <Input id="a-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-corto">¿Cómo te llamamos?</Label>
                <Input id="a-corto" value={corto} onChange={(e) => setCorto(e.target.value)} maxLength={30} placeholder={perfil.nombre.split(" ")[0]} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-rol">Rol</Label>
                <Input id="a-rol" value={rol} onChange={(e) => setRol(e.target.value)} maxLength={60} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-nac">Fecha de nacimiento</Label>
                <Input id="a-nac" type="date" value={nacimiento} onChange={(e) => setNacimiento(e.target.value)} />
              </div>
            </div>
            {error && <p className="text-sm text-critico">{error}</p>}
            {guardado && <p className="text-sm text-bien">{guardado}</p>}
            <Button type="submit">Guardar perfil</Button>
          </form>
        </Panel>

        <Panel titulo="Etapa de la misión">
          <p className="mb-4 text-sm text-tinta-suave">Cada registro nuevo guarda la etapa en la que ocurrió. Los anteriores no cambian.</p>
          <SelectorEtapa valor={perfil.etapa} alCambiar={(e) => void cambiarEtapa(e)} />
        </Panel>

        <AjustesCamara activa={perfil.ajustes.camaraActiva} camaraId={perfil.ajustes.camaraId} alCambiar={ajuste} />

        <AjustesAsistente breves={perfil.ajustes.respuestasBreves} alCambiar={ajuste} />

        <CambiarClave />

        <Panel titulo={<span className="flex items-center gap-2"><Users className="size-4 text-acento" aria-hidden /> Sesión y perfiles</span>}>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void salir()}>
              <Users className="size-4" /> Cambiar de perfil
            </Button>
            <Button variant="ghost" onClick={() => void salir()}>
              <LogOut className="size-4" /> Cerrar sesión
            </Button>
          </div>
          <div className="mt-5 space-y-2 border-t border-borde/60 pt-4">
            <p className="text-sm text-tinta-suave">Archivar oculta el perfil y conserva sus datos. Eliminar lo borra todo.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setPeligro("archivar")}>
                <Archive className="size-4" /> Archivar perfil
              </Button>
              <Button variant="ghost" className="text-critico hover:text-critico" onClick={() => setPeligro("eliminar")}>
                <Trash2 className="size-4" /> Eliminar perfil
              </Button>
            </div>
          </div>
        </Panel>
      </div>

      {peligro && <DialogoPeligro accion={peligro} alCerrar={() => setPeligro(null)} alTerminar={() => void salir()} />}
    </div>
  );
}

function AjustesCamara({ activa, camaraId, alCambiar }: { activa: boolean; camaraId: string | null; alCambiar: (c: Record<string, unknown>) => Promise<void> }) {
  const [camaras, setCamaras] = useState<MediaDeviceInfo[]>([]);
  const [probando, setProbando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const flujo = useRef<MediaStream | null>(null);

  const listar = async () => {
    try {
      const d = await navigator.mediaDevices?.enumerateDevices();
      setCamaras((d ?? []).filter((x) => x.kind === "videoinput"));
    } catch {
      setCamaras([]);
    }
  };
  useEffect(() => {
    void listar();
    return () => flujo.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const probar = async () => {
    if (probando) {
      flujo.current?.getTracks().forEach((t) => t.stop());
      setProbando(false);
      return;
    }
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: camaraId ? { deviceId: { exact: camaraId } } : true });
      flujo.current = s;
      setProbando(true);
      requestAnimationFrame(() => {
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play();
        }
      });
      await listar(); // con permiso, el navegador muestra los nombres
    } catch {
      setError("No se pudo abrir la cámara.");
    }
  };

  return (
    <Panel titulo={<span className="flex items-center gap-2"><Camera className="size-4 text-acento" aria-hidden /> Cámara</span>}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="cam-activa">Pedir la foto diaria con la cámara</Label>
          <Switch id="cam-activa" checked={activa} onCheckedChange={(v) => void alCambiar({ camaraActiva: v })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cam-id">Cámara</Label>
          <select
            id="cam-id"
            value={camaraId ?? ""}
            onChange={(e) => void alCambiar({ camaraId: e.target.value || null })}
            className="h-9 w-full rounded-md bg-casco-alto px-3 text-sm ring-1 ring-borde"
          >
            <option value="">La predeterminada</option>
            {camaras.map((c, i) => (
              <option key={c.deviceId || i} value={c.deviceId}>
                {c.label || `Cámara ${i + 1}`}
              </option>
            ))}
          </select>
        </div>
        <Button variant="outline" onClick={probar}>
          {probando ? "Detener prueba" : "Probar cámara"}
        </Button>
        {probando && <video ref={video} muted playsInline className="aspect-video w-full -scale-x-100 rounded-lg bg-black object-cover" />}
        {error && <p className="text-sm text-critico">{error}</p>}
      </div>
    </Panel>
  );
}

function AjustesAsistente({ breves, alCambiar }: { breves: boolean; alCambiar: (c: Record<string, unknown>) => Promise<void> }) {
  const { datos: cola } = useDatos<{ pendientes: number; procesados: number; ultimo: string | null }>("/ia/estado");
  return (
    <Panel titulo={<span className="flex items-center gap-2"><Database className="size-4 text-acento" aria-hidden /> Asistente</span>}>
      <div className="space-y-4">
        <Estado nivel="neutro">IA pendiente de integración</Estado>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="breves">Respuestas cortas</Label>
          <Switch id="breves" checked={breves} onCheckedChange={(v) => void alCambiar({ respuestasBreves: v })} />
        </div>
        <p className="text-xs text-tinta-tenue">La preferencia se guarda y la usará el asistente cuando esté conectado.</p>
        <div className="rounded-lg bg-casco-alto/50 p-3 text-sm">
          <p className="font-medium">Datos para la IA</p>
          <p className="text-tinta-suave">
            Cada reporte que guardas, corriges o eliminas queda en una cola local para el asistente.
            {cola && ` Pendientes: ${cola.pendientes}.`}
            {cola?.ultimo && ` Último: ${fechaHora(cola.ultimo)}.`}
          </p>
        </div>
      </div>
    </Panel>
  );
}

function CambiarClave() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (nueva !== repetir) return setMsg({ ok: false, t: "Las contraseñas nuevas no coinciden." });
    try {
      await api.post("/yo/clave", { actual, nueva });
      setActual("");
      setNueva("");
      setRepetir("");
      setMsg({ ok: true, t: "Contraseña cambiada. Se cerraron las demás sesiones." });
    } catch (err) {
      setMsg({ ok: false, t: (err as Error).message });
    }
  };

  return (
    <Panel titulo={<span className="flex items-center gap-2"><KeyRound className="size-4 text-acento" aria-hidden /> Contraseña</span>}>
      <form onSubmit={enviar} className="space-y-3">
        <Input type="password" autoComplete="current-password" placeholder="Contraseña actual" value={actual} onChange={(e) => setActual(e.target.value)} aria-label="Contraseña actual" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input type="password" autoComplete="new-password" placeholder="Nueva (8 o más)" value={nueva} onChange={(e) => setNueva(e.target.value)} aria-label="Contraseña nueva" />
          <Input type="password" autoComplete="new-password" placeholder="Repite la nueva" value={repetir} onChange={(e) => setRepetir(e.target.value)} aria-label="Repite la contraseña nueva" />
        </div>
        {msg && <p className={msg.ok ? "text-sm text-bien" : "text-sm text-critico"}>{msg.t}</p>}
        <Button type="submit" variant="secondary" disabled={!actual || nueva.length < 8}>
          Cambiar contraseña
        </Button>
      </form>
    </Panel>
  );
}

function DialogoPeligro({ accion, alCerrar, alTerminar }: { accion: "archivar" | "eliminar"; alCerrar: () => void; alTerminar: () => void }) {
  const perfil = usePerfil();
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);

  const confirmar = async () => {
    try {
      await api.post(`/perfiles/${perfil.id}/${accion}`, { clave });
      alTerminar();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && alCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{accion === "archivar" ? "Archivar tu perfil" : "Eliminar tu perfil"}</DialogTitle>
          <DialogDescription>
            {accion === "archivar"
              ? "Saldrás de la sesión. El perfil quedará en «Archivados» con todos sus datos y podrás restaurarlo."
              : "Se borran tu perfil, registros, fotos y conversaciones. No se puede deshacer."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="clave-peligro">Confirma con tu contraseña</Label>
          <Input id="clave-peligro" type="password" autoFocus value={clave} onChange={(e) => setClave(e.target.value)} />
          {error && <p className="text-sm text-critico">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button variant={accion === "eliminar" ? "destructive" : "default"} disabled={!clave} onClick={confirmar}>
            {accion === "archivar" ? "Archivar" : "Eliminar para siempre"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
